import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

interface ScheduleRequestBody {
  manga_id: string;
  platform: "twitter" | "instagram";
  scheduled_at?: string; // ISO 8601 datetime string (null = 即時投稿)
  text: string;
  hashtags: string[];
}

/**
 * POST /api/sns/schedule
 * SNS投稿をスケジュールする（または即時投稿キューに追加）
 */
export async function POST(request: NextRequest) {
  try {
    const body: ScheduleRequestBody = await request.json();
    const { manga_id, platform, scheduled_at, text, hashtags } = body;

    // バリデーション
    if (!manga_id) {
      return NextResponse.json(
        { error: "manga_id は必須です" },
        { status: 400 }
      );
    }

    if (!platform || !["twitter", "instagram"].includes(platform)) {
      return NextResponse.json(
        { error: "platform は twitter または instagram を指定してください" },
        { status: 400 }
      );
    }

    if (!text || text.trim() === "") {
      return NextResponse.json(
        { error: "投稿テキストは必須です" },
        { status: 400 }
      );
    }

    // Mangaが存在するか確認
    const manga = await prisma.manga.findUnique({
      where: { id: manga_id },
      select: { id: true, title: true, authorId: true },
    });

    if (!manga) {
      return NextResponse.json(
        { error: `manga_id: ${manga_id} が見つかりません` },
        { status: 404 }
      );
    }

    const scheduledAt = scheduled_at ? new Date(scheduled_at) : new Date();

    // SnsPost レコードを作成
    const snsPost = await prisma.snsPost.create({
      data: {
        mangaId: manga_id,
        userId: manga.authorId,
        platform,
        status: "pending",
        scheduledAt,
        // payload として text と hashtags を JSON 保存
        // SnsPost モデルに payload フィールドがないため videoUrl を一時利用 → 別途対応
      },
    });

    // payload (text, hashtags) を Job テーブルで管理
    await prisma.job.create({
      data: {
        type: "sns_post",
        status: "pending",
        mangaId: manga_id,
        payload: JSON.stringify({
          snsPostId: snsPost.id,
          platform,
          text: text.trim(),
          hashtags: hashtags ?? [],
        }),
        runAt: scheduledAt,
      },
    });

    return NextResponse.json(
      {
        success: true,
        post: {
          id: snsPost.id,
          mangaId: snsPost.mangaId,
          platform: snsPost.platform,
          status: snsPost.status,
          scheduledAt: snsPost.scheduledAt,
          createdAt: snsPost.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[sns/schedule] エラー:", error);
    return NextResponse.json(
      { error: "スケジュールの作成に失敗しました" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/sns/schedule?manga_id=xxx
 * 指定漫画のスケジュール済み投稿一覧を返す
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const manga_id = searchParams.get("manga_id");

    const where = manga_id ? { mangaId: manga_id } : {};

    const posts = await prisma.snsPost.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        manga: {
          select: { title: true },
        },
      },
    });

    return NextResponse.json({ posts });
  } catch (error) {
    console.error("[sns/schedule GET] エラー:", error);
    return NextResponse.json(
      { error: "投稿一覧の取得に失敗しました" },
      { status: 500 }
    );
  }
}
