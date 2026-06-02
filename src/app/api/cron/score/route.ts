/**
 * Cron trigger endpoint for score updates.
 *
 * POST /api/cron/score
 *
 * Protected by the CRON_SECRET environment variable.
 * Invoke via Vercel Cron or an external scheduler with:
 *   Authorization: Bearer <CRON_SECRET>
 */

import { NextRequest, NextResponse } from "next/server";
import { updateAllScores } from "@/lib/scorer";

function isCronAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // No secret configured – only allow in development
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
    await updateAllScores();
    return NextResponse.json({ ok: true, message: "Scores updated." });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

// Vercel Cron also calls GET for some scheduler configurations
export const GET = POST;
