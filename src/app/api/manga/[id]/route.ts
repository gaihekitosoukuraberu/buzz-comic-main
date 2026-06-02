import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { deleteMangaImages } from "@/lib/storage";

type RouteContext = { params: Promise<{ id: string }> };

function parseTags(tags: string | null): string[] {
  if (!tags) return [];
  try {
    return JSON.parse(tags);
  } catch {
    return [];
  }
}

// GET /api/manga/[id]
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const manga = await prisma.manga.findUnique({
      where: { id },
      include: {
        panels: { orderBy: { order: "asc" } },
        _count: { select: { panels: true } },
      },
    });

    if (!manga) {
      return NextResponse.json({ error: "漫画が見つかりません" }, { status: 404 });
    }

    return NextResponse.json({ ...manga, tags: parseTags(manga.tags) });
  } catch (error) {
    console.error("[manga GET/:id] error:", error);
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}

// PUT /api/manga/[id]
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { title, description, genre, tags, coverUrl, coverWidth, coverHeight } = body;

    const existing = await prisma.manga.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "漫画が見つかりません" }, { status: 404 });
    }

    const updated = await prisma.manga.update({
      where: { id },
      data: {
        ...(title !== undefined ? { title: String(title).trim() } : {}),
        ...(description !== undefined ? { description: String(description).trim() } : {}),
        ...(genre !== undefined ? { genre } : {}),
        ...(tags !== undefined ? { tags: JSON.stringify(tags) } : {}),
        ...(coverUrl !== undefined ? { coverImageUrl: coverUrl } : {}),
        ...(coverWidth !== undefined ? {} : {}),
        ...(coverHeight !== undefined ? {} : {}),
      },
      include: {
        panels: { orderBy: { order: "asc" } },
      },
    });

    return NextResponse.json({ ...updated, tags: parseTags(updated.tags) });
  } catch (error) {
    console.error("[manga PUT/:id] error:", error);
    return NextResponse.json({ error: "更新に失敗しました" }, { status: 500 });
  }
}

// DELETE /api/manga/[id]
export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const existing = await prisma.manga.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "漫画が見つかりません" }, { status: 404 });
    }

    // Delete DB record (panels cascade)
    await prisma.manga.delete({ where: { id } });

    // Clean up uploaded files
    await deleteMangaImages(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[manga DELETE/:id] error:", error);
    return NextResponse.json({ error: "削除に失敗しました" }, { status: 500 });
  }
}
