import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { RevenueType } from "@/lib/revenue";

interface AddRevenueBody {
  mangaId: string;
  amount: number;
  type: RevenueType;
  description?: string;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: AddRevenueBody;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { mangaId, amount, type, description } = body;
  if (!mangaId || typeof amount !== "number" || amount <= 0) {
    return Response.json(
      { error: "mangaId and positive amount are required" },
      { status: 400 }
    );
  }

  const validTypes: RevenueType[] = ["ad_view", "tip", "subscription_share"];
  if (!validTypes.includes(type)) {
    return Response.json({ error: "Invalid type" }, { status: 400 });
  }

  try {
    const manga = await prisma.manga.findUnique({
      where: { id: mangaId },
      select: { id: true, revenueTotal: true, authorId: true, author: { select: { totalRevenue: true } } },
    });
    if (!manga) {
      return Response.json({ error: "Manga not found" }, { status: 404 });
    }

    const revenue = await prisma.revenue.create({
      data: { mangaId, amount, type, description },
    });

    await prisma.manga.update({
      where: { id: mangaId },
      data: { revenueTotal: manga.revenueTotal + amount },
    });

    await prisma.user.update({
      where: { id: manga.authorId },
      data: { totalRevenue: manga.author.totalRevenue + amount },
    });

    return Response.json(revenue, { status: 201 });
  } catch (err) {
    console.error("[POST /api/admin/revenue/add]", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
