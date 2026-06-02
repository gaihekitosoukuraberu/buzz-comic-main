import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/admin/users - ユーザー一覧
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 100);
    const skip = (page - 1) * limit;
    const search = searchParams.get("search") ?? undefined;

    const where = search
      ? {
          OR: [
            { name: { contains: search } },
            { email: { contains: search } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          avatarUrl: true,
          totalRevenue: true,
          createdAt: true,
          _count: { select: { mangas: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({
      users,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Users GET error:", error);
    return NextResponse.json(
      { error: "ユーザー一覧の取得に失敗しました" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/users - ロール変更
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id, role } = body as { user_id: string; role: string };

    if (!user_id || !role) {
      return NextResponse.json(
        { error: "user_id と role は必須です" },
        { status: 400 }
      );
    }

    const validRoles = ["user", "creator", "admin", "suspended"];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: `role は ${validRoles.join(", ")} のいずれかである必要があります` },
        { status: 400 }
      );
    }

    const updated = await prisma.user.update({
      where: { id: user_id },
      data: { role },
    });

    return NextResponse.json({ user: updated });
  } catch (error) {
    console.error("Users PATCH error:", error);
    return NextResponse.json(
      { error: "ロールの更新に失敗しました" },
      { status: 500 }
    );
  }
}
