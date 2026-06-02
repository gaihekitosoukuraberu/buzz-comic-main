import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/admin/manga - 全漫画一覧
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 100);
    const skip = (page - 1) * limit;
    const status = searchParams.get("status") ?? undefined;
    const search = searchParams.get("search") ?? undefined;

    const where = {
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search } },
              { description: { contains: search } },
            ],
          }
        : {}),
    };

    const [mangas, total] = await Promise.all([
      prisma.manga.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          author: {
            select: { id: true, name: true, email: true },
          },
          _count: {
            select: { panels: true, revenues: true },
          },
        },
      }),
      prisma.manga.count({ where }),
    ]);

    return NextResponse.json({
      mangas,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Manga list GET error:", error);
    return NextResponse.json(
      { error: "漫画一覧の取得に失敗しました" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/manga - ステータス変更
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { manga_id, status } = body as {
      manga_id: string;
      status: string;
    };

    if (!manga_id || !status) {
      return NextResponse.json(
        { error: "manga_id と status は必須です" },
        { status: 400 }
      );
    }

    const validStatuses = ["draft", "pending", "published", "culled", "rejected"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `status は ${validStatuses.join(", ")} のいずれかである必要があります` },
        { status: 400 }
      );
    }

    const updated = await prisma.manga.update({
      where: { id: manga_id },
      data: {
        status,
        culledAt: status === "culled" ? new Date() : undefined,
        publishedAt:
          status === "published"
            ? new Date()
            : undefined,
      },
    });

    return NextResponse.json({ manga: updated });
  } catch (error) {
    console.error("Manga PATCH error:", error);
    return NextResponse.json(
      { error: "ステータスの更新に失敗しました" },
      { status: 500 }
    );
  }
}
