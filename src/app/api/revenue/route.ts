import { NextRequest } from "next/server";
import { getCreatorRevenue } from "@/lib/revenue";
import { auth } from "@/auth";

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const stats = await getCreatorRevenue(session.user.id);
    return Response.json(stats);
  } catch (err) {
    console.error("[GET /api/revenue]", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
