/**
 * GET /api/video/[mangaId]?format=vertical|square
 *
 * Serves the generated MP4 video file for a given manga.
 * Supports byte-range requests for browser <video> seek.
 */

import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

interface RouteContext {
  params: Promise<{ mangaId: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { mangaId } = await context.params;
  const format = (request.nextUrl.searchParams.get('format') ?? 'vertical') as
    | 'vertical'
    | 'square';

  if (format !== 'vertical' && format !== 'square') {
    return NextResponse.json(
      { error: 'format は vertical または square を指定してください' },
      { status: 400 }
    );
  }

  const videoPath = path.join(process.cwd(), 'public', 'videos', mangaId, `${format}.mp4`);

  if (!fs.existsSync(videoPath)) {
    return NextResponse.json({ error: '動画が見つかりません' }, { status: 404 });
  }

  const stat = fs.statSync(videoPath);
  const fileSize = stat.size;
  const rangeHeader = request.headers.get('range');

  if (rangeHeader) {
    // Parse "bytes=start-end"
    const match = /bytes=(\d+)-(\d*)/.exec(rangeHeader);
    if (!match) {
      return NextResponse.json({ error: 'Invalid Range header' }, { status: 416 });
    }

    const start = parseInt(match[1], 10);
    const end = match[2] ? parseInt(match[2], 10) : fileSize - 1;
    const chunkSize = end - start + 1;

    const buffer = Buffer.alloc(chunkSize);
    const fd = fs.openSync(videoPath, 'r');
    fs.readSync(fd, buffer, 0, chunkSize, start);
    fs.closeSync(fd);

    return new NextResponse(buffer, {
      status: 206,
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': String(chunkSize),
        'Cache-Control': 'public, max-age=3600',
      },
    });
  }

  // Full file response
  const buffer = fs.readFileSync(videoPath);

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'video/mp4',
      'Content-Length': String(fileSize),
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=3600',
      'Content-Disposition': `inline; filename="${mangaId}-${format}.mp4"`,
    },
  });
}
