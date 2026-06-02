/**
 * Admin Score API
 *
 * POST /api/admin/score/recalculate  – manual full recalculation
 * GET  /api/admin/score/stats        – score statistics
 * POST /api/admin/score/cull         – manual culling
 *
 * All endpoints require an authenticated admin session.
 * (Auth guard is a simple header check so the existing auth system can be
 *  wired in without knowing its exact shape yet.)
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { updateAllScores, cullLowScoreMangas, calculateScore, shouldCull } from "@/lib/scorer";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

/** Very simple admin guard – extend with real session check as needed. */
async function isAdmin(_req: NextRequest): Promise<boolean> {
  // TODO: replace with real session / role check once auth is wired in.
  // For now, allow in development or when the X-Admin-Key header matches.
  const adminKey = process.env.ADMIN_API_KEY;
  if (adminKey) {
    return _req.headers.get("x-admin-key") === adminKey;
  }
  return process.env.NODE_ENV === "development";
}

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  if (!(await isAdmin(req))) return unauthorized();

  const { pathname } = new URL(req.url);
  const action = pathname.split("/").pop(); // "recalculate" | "cull"

  if (action === "recalculate") {
    await updateAllScores();
    return NextResponse.json({ ok: true, message: "Scores recalculated." });
  }

  if (action === "cull") {
    const culled = await cullLowScoreMangas();
    return NextResponse.json({ ok: true, culled });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

export async function GET(req: NextRequest) {
  if (!(await isAdmin(req))) return unauthorized();

  // Aggregate statistics
  const [totalMangas, publishedMangas, culledMangas, avgScore, scoreRows] =
    await Promise.all([
      prisma.manga.count(),
      prisma.manga.count({ where: { status: "published" } }),
      prisma.manga.count({ where: { status: "culled" } }),
      prisma.manga.aggregate({ _avg: { score: true } }),
      prisma.manga.findMany({
        where: { status: { in: ["published", "approved"] } },
        select: {
          id: true,
          title: true,
          totalViews: true,
          totalLikes: true,
          totalShares: true,
          publishedAt: true,
          status: true,
          score: true,
        },
        orderBy: { score: "desc" },
        take: 10,
      }),
    ]);

  // Count mangas that WILL be culled within the next 7 days
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const soonToCull = scoreRows.filter((m) => {
    if (!m.publishedAt) return false;
    const daysSince =
      (Date.now() - m.publishedAt.getTime()) / (1000 * 60 * 60 * 24);
    // Within 7 days of the 30-day threshold
    return daysSince >= 23 && m.score < 10 && m.status !== "culled";
  });

  return NextResponse.json({
    totalMangas,
    publishedMangas,
    culledMangas,
    averageScore: avgScore._avg.score ?? 0,
    topMangas: scoreRows,
    soonToCullCount: soonToCull.length,
  });
}
