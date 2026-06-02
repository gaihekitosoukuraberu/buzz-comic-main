/**
 * Cron trigger endpoint for culling low-score mangas.
 *
 * POST /api/cron/cull
 *
 * Protected by the CRON_SECRET environment variable.
 * Invoke via Vercel Cron or an external scheduler with:
 *   Authorization: Bearer <CRON_SECRET>
 */

import { NextRequest, NextResponse } from "next/server";
import { cullLowScoreMangas } from "@/lib/scorer";

function isCronAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return process.env.NODE_ENV === "development";
  }
  const authHeader = req.headers.get("authorization");
  return authHeader === `Bearer ${secret}`;
}

export async function POST(req: NextRequest) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const culled = await cullLowScoreMangas();
    return NextResponse.json({ ok: true, culled });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export const GET = POST;
