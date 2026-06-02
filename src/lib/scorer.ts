/**
 * Score engine for Buzz Comic.
 *
 * Score formula:
 *   score = (views * 1) + (likes * 10) + (shares * 20) - (days_since_publish * 0.5)
 *
 * Cull condition:
 *   days_since_publish >= 30 AND score < 10
 */

import { prisma } from "@/lib/db";
import {
  SCORE_CULL_THRESHOLD,
  SCORE_CULL_DAYS,
} from "@/lib/constants";

// ---------------------------------------------------------------------------
// Types (inline because generated models.ts doesn't export Manga yet)
// ---------------------------------------------------------------------------

export interface MangaForScoring {
  id: string;
  totalViews: number;
  totalLikes: number;
  totalShares: number;
  publishedAt: Date | null;
  status: string;
  score: number;
}

// ---------------------------------------------------------------------------
// Pure calculation helpers
// ---------------------------------------------------------------------------

/**
 * Calculate the buzz score for a manga.
 * Uses current wall-clock time as "now".
 */
export function calculateScore(manga: MangaForScoring): number {
  const views = manga.totalViews;
  const likes = manga.totalLikes;
  const shares = manga.totalShares;

  const publishedAt = manga.publishedAt ?? new Date();
  const daysSincePublish =
    (Date.now() - publishedAt.getTime()) / (1000 * 60 * 60 * 24);

  const score =
    views * 1 + likes * 10 + shares * 20 - daysSincePublish * 0.5;

  // Round to 2 decimal places to keep the DB tidy
  return Math.round(score * 100) / 100;
}

/**
 * Return true when the manga meets the culling criteria:
 *   - published at least SCORE_CULL_DAYS (30) days ago
 *   - current score < SCORE_CULL_THRESHOLD (10)
 */
export function shouldCull(manga: MangaForScoring): boolean {
  if (!manga.publishedAt) return false;
  if (manga.status === "culled") return false;

  const daysSincePublish =
    (Date.now() - manga.publishedAt.getTime()) / (1000 * 60 * 60 * 24);

  return (
    daysSincePublish >= SCORE_CULL_DAYS &&
    manga.score < SCORE_CULL_THRESHOLD
  );
}

// ---------------------------------------------------------------------------
// Database operations
// ---------------------------------------------------------------------------

/**
 * Recalculate and persist scores for every published manga.
 * Also writes a snapshot row to the Score history table.
 */
export async function updateAllScores(): Promise<void> {
  const mangas = await prisma.manga.findMany({
    where: {
      status: { in: ["published", "approved"] },
    },
    select: {
      id: true,
      totalViews: true,
      totalLikes: true,
      totalShares: true,
      publishedAt: true,
      status: true,
      score: true,
    },
  });

  for (const manga of mangas) {
    const newScore = calculateScore(manga as MangaForScoring);

    await prisma.$transaction([
      // Update the denormalised score on the Manga row
      prisma.manga.update({
        where: { id: manga.id },
        data: { score: newScore },
      }),
      // Append a history snapshot
      prisma.score.create({
        data: {
          mangaId: manga.id,
          value: newScore,
          views: manga.totalViews,
          likes: manga.totalLikes,
          shares: manga.totalShares,
        },
      }),
    ]);
  }
}

/**
 * Mark low-scoring, stale mangas as "culled".
 *
 * @returns Number of mangas that were culled.
 */
export async function cullLowScoreMangas(): Promise<number> {
  const candidates = await prisma.manga.findMany({
    where: {
      status: { in: ["published", "approved"] },
    },
    select: {
      id: true,
      totalViews: true,
      totalLikes: true,
      totalShares: true,
      publishedAt: true,
      status: true,
      score: true,
    },
  });

  const toCull = (candidates as MangaForScoring[]).filter(shouldCull);

  if (toCull.length === 0) return 0;

  await prisma.manga.updateMany({
    where: { id: { in: toCull.map((m) => m.id) } },
    data: {
      status: "culled",
      culledAt: new Date(),
    },
  });

  return toCull.length;
}
