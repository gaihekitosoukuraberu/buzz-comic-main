import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

// Anonymous like using a session-based fingerprint (IP + User-Agent).
// For authenticated likes, integrate with next-auth session here.
function getAnonymousId(request: NextRequest): string {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";
  const ua = request.headers.get("user-agent") ?? "unknown";
  // Simple deterministic ID - not cryptographically secure, suitable for anonymous rate-limiting
  return Buffer.from(`${ip}::${ua}`).toString("base64").slice(0, 32);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const manga = await prisma.manga.findUnique({
      where: { id },
      select: { id: true, status: true },
    });

    if (!manga || manga.status !== "published") {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    const userId = getAnonymousId(request);

    // Upsert like record
    await prisma.mangaLike.upsert({
      where: { mangaId_userId: { mangaId: id, userId } },
      create: { mangaId: id, userId },
      update: {},
    });

    // Sync totalLikes from actual count
    const likeCount = await prisma.mangaLike.count({ where: { mangaId: id } });
    await prisma.manga.update({
      where: { id },
      data: { totalLikes: likeCount },
    });

    return Response.json({ success: true, likes: likeCount });
  } catch (error) {
    console.error("like error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const userId = getAnonymousId(request);

    await prisma.mangaLike.deleteMany({
      where: { mangaId: id, userId },
    });

    const likeCount = await prisma.mangaLike.count({ where: { mangaId: id } });
    await prisma.manga.update({
      where: { id },
      data: { totalLikes: likeCount },
    });

    return Response.json({ success: true, likes: likeCount });
  } catch (error) {
    console.error("unlike error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
