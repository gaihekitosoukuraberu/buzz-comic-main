import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/admin/review - pending 漫画一覧
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 100);
    const skip = (page - 1) * limit;

    const [mangas, total] = await Promise.all([
      prisma.manga.findMany({
        where: { status: "pending" },
        orderBy: { createdAt: "asc" },
        skip,
        take: limit,
        include: {
          author: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
          panels: {
            orderBy: { order: "asc" },
            select: { id: true, imageUrl: true, order: true },
          },
        },
      }),
      prisma.manga.count({ where: { status: "pending" } }),
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
    console.error("Review GET error:", error);
    return NextResponse.json(
      { error: "審査キューの取得に失敗しました" },
      { status: 500 }
    );
  }
}

// POST /api/admin/review - 審査決定 { manga_id, decision, reason }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { manga_id, decision, reason } = body as {
      manga_id: string;
      decision: "approved" | "rejected";
      reason?: string;
    };

    if (!manga_id || !decision) {
      return NextResponse.json(
        { error: "manga_id と decision は必須です" },
        { status: 400 }
      );
    }

    if (!["approved", "rejected"].includes(decision)) {
      return NextResponse.json(
        { error: "decision は approved または rejected である必要があります" },
        { status: 400 }
      );
    }

    const manga = await prisma.manga.findUnique({ where: { id: manga_id } });
    if (!manga) {
      return NextResponse.json(
        { error: "漫画が見つかりません" },
        { status: 404 }
      );
    }

    const newStatus = decision === "approved" ? "published" : "rejected";

    // Update manga status and create review record
    const [updatedManga, review] = await prisma.$transaction([
      prisma.manga.update({
        where: { id: manga_id },
        data: {
          status: newStatus,
          publishedAt: decision === "approved" ? new Date() : undefined,
        },
      }),
      prisma.review.create({
        data: {
          mangaId: manga_id,
          // Using a placeholder reviewer ID; in production use authenticated admin ID
          reviewerId: manga.authorId,
          decision,
          reason: reason ?? null,
        },
      }),
    ]);

    return NextResponse.json({ manga: updatedManga, review });
  } catch (error) {
    console.error("Review POST error:", error);
    return NextResponse.json(
      { error: "審査決定の保存に失敗しました" },
      { status: 500 }
    );
  }
}
