/**
 * POST /api/generate
 *
 * Body:  { prompt: string; style: "anime" | "realistic" | "monochrome"; panels_count: number; manga_id?: string }
 * Reply: { job_id: string; status: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { enqueueGenerationJob } from "@/lib/flux/queue";
import type { MangaStyle } from "@/lib/flux/workflow";

const VALID_STYLES: MangaStyle[] = ["anime", "realistic", "monochrome"];

export async function POST(req: NextRequest) {
  let body: {
    prompt?: unknown;
    style?: unknown;
    panels_count?: unknown;
    manga_id?: unknown;
  };

  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // --- Validate ---
  if (!body.prompt || typeof body.prompt !== "string") {
    return NextResponse.json({ error: "prompt is required" }, { status: 400 });
  }

  const prompt = body.prompt.trim();
  if (prompt.length === 0) {
    return NextResponse.json(
      { error: "prompt must not be empty" },
      { status: 400 }
    );
  }

  const style: MangaStyle =
    typeof body.style === "string" && VALID_STYLES.includes(body.style as MangaStyle)
      ? (body.style as MangaStyle)
      : "anime";

  const rawCount =
    typeof body.panels_count === "number" ? body.panels_count : 1;
  const panelsCount = Math.max(1, Math.min(8, Math.round(rawCount)));

  const mangaId =
    typeof body.manga_id === "string" && body.manga_id.length > 0
      ? body.manga_id
      : undefined;

  // --- Enqueue ---
  const job = await enqueueGenerationJob({ prompt, style, panelsCount, mangaId });

  return NextResponse.json(
    { job_id: job.id, status: job.status },
    { status: 202 }
  );
}
