import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(
  _request: NextRequest,
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

    await prisma.manga.update({
      where: { id },
      data: { totalViews: { increment: 1 } },
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("view count error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
