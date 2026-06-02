import { NextRequest } from "next/server";
import { getSiteRevenueSummary } from "@/lib/revenue";
import { auth } from "@/auth";

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const summary = await getSiteRevenueSummary();
    return Response.json(summary);
  } catch (err) {
    console.error("[GET /api/admin/revenue]", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
