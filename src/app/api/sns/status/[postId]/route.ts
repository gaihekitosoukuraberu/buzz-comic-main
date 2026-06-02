import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

interface RouteParams {
  params: Promise<{ postId: string }>;
}

/**
 * GET /api/sns/status/[postId]
 * 指定した SNS 投稿の状態を返す
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { postId } = await params;

    if (!postId) {
      return NextResponse.json(
        { error: "postId は必須です" },
        { status: 400 }
      );
    }

    const post = await prisma.snsPost.findUnique({
      where: { id: postId },
      include: {
        manga: {
          select: {
            id: true,
            title: true,
            genre: true,
          },
        },
      },
    });

    if (!post) {
      return NextResponse.json(
        { error: `投稿 ID: ${postId} が見つかりません` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      post: {
        id: post.id,
        mangaId: post.mangaId,
        mangaTitle: post.manga?.title,
        platform: post.platform,
        status: post.status,
        postUrl: post.postUrl,
        error: post.error,
        scheduledAt: post.scheduledAt,
        postedAt: post.postedAt,
        createdAt: post.createdAt,
      },
    });
  } catch (error) {
    console.error("[sns/status] エラー:", error);
    return NextResponse.json(
      { error: "投稿状態の取得に失敗しました" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/sns/status/[postId]
 * スケジュール済みの投稿をキャンセル（pending のみ）
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { postId } = await params;

    const post = await prisma.snsPost.findUnique({
      where: { id: postId },
      select: { id: true, status: true },
    });

    if (!post) {
      return NextResponse.json(
        { error: `投稿 ID: ${postId} が見つかりません` },
        { status: 404 }
      );
    }

    if (post.status !== "pending") {
      return NextResponse.json(
        { error: `ステータスが pending の投稿のみキャンセルできます（現在: ${post.status}）` },
        { status: 400 }
      );
    }

    await prisma.snsPost.delete({ where: { id: postId } });

    // 関連する Job もキャンセル（status を "failed" に変更）
    await prisma.job.updateMany({
      where: {
        type: "sns_post",
        status: "pending",
        payload: { contains: postId },
      },
      data: { status: "failed" },
    });

    return NextResponse.json({ success: true, message: "投稿をキャンセルしました" });
  } catch (error) {
    console.error("[sns/status DELETE] エラー:", error);
    return NextResponse.json(
      { error: "投稿キャンセルに失敗しました" },
      { status: 500 }
    );
  }
}
