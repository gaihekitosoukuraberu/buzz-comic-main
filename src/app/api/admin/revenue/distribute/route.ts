import { NextRequest } from "next/server";
import { distributeRevenue } from "@/lib/revenue";
import { auth } from "@/auth";

export async function POST(_req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await distributeRevenue();
    return Response.json({ message: "収益分配が完了しました" });
  } catch (err) {
    console.error("[POST /api/admin/revenue/distribute]", err);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
