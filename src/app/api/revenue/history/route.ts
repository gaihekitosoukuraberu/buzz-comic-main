import { NextRequest } from "next/server";
import { getRevenueHistory } from "@/lib/revenue";
import { auth } from "@/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const pageSize = Math.min(parseInt(searchParams.get("pageSize") ?? "20", 10), 100);

  try {
    const history = await getRevenueHistory(session.user.id, page, pageSize);
    return Response.json(history);
  } catch (err) {
    console.error("[GET /api/revenue/history]", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
