import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "@/lib/constants";

// POST /api/manga - 新規作成
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, genre, tags, authorId } = body;

    if (!title || typeof title !== "string" || title.trim() === "") {
      return NextResponse.json({ error: "タイトルは必須です" }, { status: 400 });
    }

    const manga = await prisma.manga.create({
      data: {
        title: title.trim(),
        description: description?.trim() ?? null,
        genre: genre ?? "general",
        tags: tags ? JSON.stringify(tags) : "[]",
        authorId: authorId ?? "anonymous",
        status: "draft",
        isAiGenerated: false,
      },
      include: {
        panels: { orderBy: { order: "asc" } },
      },
    });

    return NextResponse.json(
      { ...manga, tags: parseTags(manga.tags) },
      { status: 201 }
    );
  } catch (error) {
    console.error("[manga POST] error:", error);
    return NextResponse.json({ error: "作成に失敗しました" }, { status: 500 });
  }
}

// GET /api/manga - 一覧取得（ページネーション）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, parseInt(searchParams.get("limit") ?? String(DEFAULT_PAGE_SIZE), 10))
    );
    const status = searchParams.get("status") ?? undefined;
    const genre = searchParams.get("genre") ?? undefined;
    const authorId = searchParams.get("authorId") ?? undefined;

    const where = {
      ...(status ? { status } : {}),
      ...(genre ? { genre } : {}),
      ...(authorId ? { authorId } : {}),
    };

    const [total, mangas] = await Promise.all([
      prisma.manga.count({ where }),
      prisma.manga.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          panels: { orderBy: { order: "asc" }, take: 1 },
          _count: { select: { panels: true } },
        },
      }),
    ]);

    return NextResponse.json({
      data: mangas.map((m) => ({ ...m, tags: parseTags(m.tags) })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[manga GET] error:", error);
    return NextResponse.json({ error: "一覧取得に失敗しました" }, { status: 500 });
  }
}

function parseTags(tags: string | null): string[] {
  if (!tags) return [];
  try {
    return JSON.parse(tags);
  } catch {
    return [];
  }
}
