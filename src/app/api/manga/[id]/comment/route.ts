import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

// Temporary anonymous user ID from request fingerprint
function getAnonymousId(request: NextRequest): string {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";
  const ua = request.headers.get("user-agent") ?? "unknown";
  return Buffer.from(`${ip}::${ua}`).toString("base64").slice(0, 32);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: mangaId } = await params;

  try {
    const body = await request.json();
    const content = typeof body.content === "string" ? body.content.trim() : "";

    if (!content || content.length > 500) {
      return Response.json(
        { error: "コメントは1〜500文字で入力してください" },
        { status: 400 }
      );
    }

    const manga = await prisma.manga.findUnique({
      where: { id: mangaId },
      select: { id: true, status: true },
    });

    if (!manga || manga.status !== "published") {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    // Use anonymous user ID - in production integrate with next-auth session
    const anonymousUserId = getAnonymousId(request);

    // Ensure anonymous user exists in DB (upsert by email convention)
    const anonymousEmail = `anon_${anonymousUserId}@buzz-comic.local`;
    const user = await prisma.user.upsert({
      where: { email: anonymousEmail },
      create: {
        email: anonymousEmail,
        name: "匿名ユーザー",
      },
      update: {},
    });

    const comment = await prisma.mangaComment.create({
      data: {
        mangaId,
        userId: user.id,
        content,
      },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    return Response.json(comment, { status: 201 });
  } catch (error) {
    console.error("comment error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: mangaId } = await params;

  try {
    const comments = await prisma.mangaComment.findMany({
      where: { mangaId },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    return Response.json(comments);
  } catch (error) {
    console.error("comment get error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
