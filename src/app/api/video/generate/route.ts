/**
 * POST /api/video/generate
 *
 * Accepts { manga_id, format } and enqueues a video_generate job.
 * Returns { job_id }.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

interface GenerateRequestBody {
  manga_id?: string;
  format?: 'vertical' | 'square';
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as GenerateRequestBody;
    const { manga_id, format = 'vertical' } = body;

    if (!manga_id) {
      return NextResponse.json({ error: 'manga_id は必須です' }, { status: 400 });
    }

    if (format !== 'vertical' && format !== 'square') {
      return NextResponse.json(
        { error: 'format は vertical または square を指定してください' },
        { status: 400 }
      );
    }

    // Verify the manga exists and has panels
    const manga = await prisma.manga.findUnique({
      where: { id: manga_id },
      include: {
        panels: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!manga) {
      return NextResponse.json({ error: '漫画が見つかりません' }, { status: 404 });
    }

    if (!manga.panels || manga.panels.length === 0) {
      return NextResponse.json({ error: 'パネルが登録されていません' }, { status: 422 });
    }

    // Check for an existing pending or running job to avoid duplicates
    const existingJob = await prisma.job.findFirst({
      where: {
        type: 'video_generate',
        mangaId: manga_id,
        status: { in: ['pending', 'running'] },
        payload: { contains: `"format":"${format}"` },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existingJob) {
      return NextResponse.json({ job_id: existingJob.id, status: existingJob.status });
    }

    // Create a new job record
    const job = await prisma.job.create({
      data: {
        type: 'video_generate',
        mangaId: manga_id,
        status: 'pending',
        payload: JSON.stringify({
          manga_id,
          format,
          title: manga.title,
          author_id: manga.authorId,
          panel_count: manga.panels.length,
        }),
        maxAttempts: 3,
      },
    });

    return NextResponse.json({ job_id: job.id, status: job.status }, { status: 202 });
  } catch (error) {
    console.error('[api/video/generate] error:', error);
    return NextResponse.json({ error: '動画生成ジョブの作成に失敗しました' }, { status: 500 });
  }
}

/**
 * GET /api/video/generate?job_id=xxx
 *
 * Poll job status and result.
 */
export async function GET(request: NextRequest) {
  const jobId = request.nextUrl.searchParams.get('job_id');

  if (!jobId) {
    return NextResponse.json({ error: 'job_id は必須です' }, { status: 400 });
  }

  const job = await prisma.job.findUnique({ where: { id: jobId } });

  if (!job) {
    return NextResponse.json({ error: 'ジョブが見つかりません' }, { status: 404 });
  }

  const result = job.result ? (JSON.parse(job.result) as Record<string, unknown>) : null;

  return NextResponse.json({
    job_id: job.id,
    status: job.status,
    error: job.error,
    result,
    started_at: job.startedAt,
    completed_at: job.completedAt,
  });
}
