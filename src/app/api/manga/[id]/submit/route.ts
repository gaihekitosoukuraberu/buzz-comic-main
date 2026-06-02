import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type RouteContext = { params: Promise<{ id: string }> };

// POST /api/manga/[id]/submit - 審査提出 (status を pending に変更)
export async function POST(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    const manga = await prisma.manga.findUnique({
      where: { id },
      include: { _count: { select: { panels: true } } },
    });

    if (!manga) {
      return NextResponse.json({ error: "漫画が見つかりません" }, { status: 404 });
    }

    if (manga.status === "pending") {
      return NextResponse.json(
        { error: "すでに審査申請済みです" },
        { status: 409 }
      );
    }

    if (manga.status === "approved" || manga.status === "published") {
      return NextResponse.json(
        { error: "承認済みの漫画は再提出できません" },
        { status: 409 }
      );
    }

    if (!manga.title || manga.title.trim() === "") {
      return NextResponse.json(
        { error: "タイトルを入力してください" },
        { status: 400 }
      );
    }

    if (manga._count.panels === 0) {
      return NextResponse.json(
        { error: "パネルを1枚以上追加してください" },
        { status: 400 }
      );
    }

    const updated = await prisma.manga.update({
      where: { id },
      data: { status: "pending" },
    });

    return NextResponse.json({
      ...updated,
      message: "審査に提出しました",
    });
  } catch (error) {
    console.error("[submit POST] error:", error);
    return NextResponse.json({ error: "提出に失敗しました" }, { status: 500 });
  }
}
