import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type RouteContext = { params: Promise<{ id: string }> };

// POST /api/manga/[id]/panels - パネル追加
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id: mangaId } = await context.params;
    const body = await request.json();
    const { imageUrl, width, height, order, prompt, altText } = body;

    if (!imageUrl) {
      return NextResponse.json({ error: "imageUrl は必須です" }, { status: 400 });
    }

    const manga = await prisma.manga.findUnique({ where: { id: mangaId } });
    if (!manga) {
      return NextResponse.json({ error: "漫画が見つかりません" }, { status: 404 });
    }

    // Determine order if not specified (append to end)
    let panelOrder = order;
    if (panelOrder === undefined || panelOrder === null) {
      const maxPanel = await prisma.panel.findFirst({
        where: { mangaId },
        orderBy: { order: "desc" },
      });
      panelOrder = maxPanel ? maxPanel.order + 1 : 0;
    }

    const panel = await prisma.panel.create({
      data: {
        mangaId,
        imageUrl,
        width: width ?? 0,
        height: height ?? 0,
        order: panelOrder,
        prompt: prompt ?? null,
        altText: altText ?? null,
      },
    });

    return NextResponse.json(panel, { status: 201 });
  } catch (error) {
    console.error("[panels POST] error:", error);
    return NextResponse.json({ error: "パネルの追加に失敗しました" }, { status: 500 });
  }
}

// GET /api/manga/[id]/panels - パネル一覧
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id: mangaId } = await context.params;

    const manga = await prisma.manga.findUnique({ where: { id: mangaId } });
    if (!manga) {
      return NextResponse.json({ error: "漫画が見つかりません" }, { status: 404 });
    }

    const panels = await prisma.panel.findMany({
      where: { mangaId },
      orderBy: { order: "asc" },
    });

    return NextResponse.json(panels);
  } catch (error) {
    console.error("[panels GET] error:", error);
    return NextResponse.json({ error: "パネル一覧の取得に失敗しました" }, { status: 500 });
  }
}

// PUT /api/manga/[id]/panels/reorder - パネル並び替え
// Note: Next.js App Router では /panels/reorder は別ファイルで対応
// ここで PATCH メソッドとして実装し、reorder も受け付ける
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id: mangaId } = await context.params;
    const body = await request.json();

    // Expect: { panels: [{ id: string, order: number }] }
    const { panels } = body;
    if (!Array.isArray(panels)) {
      return NextResponse.json(
        { error: "panels 配列が必要です" },
        { status: 400 }
      );
    }

    const manga = await prisma.manga.findUnique({ where: { id: mangaId } });
    if (!manga) {
      return NextResponse.json({ error: "漫画が見つかりません" }, { status: 404 });
    }

    // Update each panel's order in a transaction
    await prisma.$transaction(
      panels.map((p: { id: string; order: number }) =>
        prisma.panel.update({
          where: { id: p.id },
          data: { order: p.order },
        })
      )
    );

    const updated = await prisma.panel.findMany({
      where: { mangaId },
      orderBy: { order: "asc" },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[panels PUT] error:", error);
    return NextResponse.json({ error: "並び替えに失敗しました" }, { status: 500 });
  }
}
