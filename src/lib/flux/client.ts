/**
 * ComfyUI REST API client for FLUX.2 local image generation.
 * Falls back to mock mode when ComfyUI is not running.
 */

import { COMFYUI_API_URL } from "@/lib/constants";

export interface ComfyPromptResponse {
  prompt_id: string;
  number: number;
  node_errors: Record<string, unknown>;
}

export interface ComfyHistoryItem {
  prompt: unknown[];
  outputs: Record<
    string,
    {
      images?: Array<{
        filename: string;
        subfolder: string;
        type: string;
      }>;
    }
  >;
  status: {
    status_str: string;
    completed: boolean;
    messages: unknown[];
  };
}

export interface ComfyQueueStatus {
  queue_running: Array<[number, string, unknown, unknown]>;
  queue_pending: Array<[number, string, unknown, unknown]>;
}

export type GenerationResult = {
  images: string[]; // public URLs or base64 data URLs
  promptId: string;
};

// -------------------------------------------------------------------
// Health check
// -------------------------------------------------------------------

export async function isComfyUIAvailable(): Promise<boolean> {
  try {
    const res = await fetch(`${COMFYUI_API_URL}/system_stats`, {
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// -------------------------------------------------------------------
// Submit a workflow to ComfyUI /prompt
// -------------------------------------------------------------------

export async function submitPrompt(
  workflow: Record<string, unknown>
): Promise<ComfyPromptResponse> {
  const res = await fetch(`${COMFYUI_API_URL}/prompt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: workflow }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ComfyUI /prompt error ${res.status}: ${text}`);
  }

  return (await res.json()) as ComfyPromptResponse;
}

// -------------------------------------------------------------------
// Poll /history until the job is done (timeout: 5 min)
// -------------------------------------------------------------------

export async function waitForCompletion(
  promptId: string,
  timeoutMs = 5 * 60 * 1000
): Promise<ComfyHistoryItem> {
  const deadline = Date.now() + timeoutMs;
  const pollIntervalMs = 2000;

  while (Date.now() < deadline) {
    const history = await fetchHistory(promptId);
    if (history) {
      if (!history.status.completed) {
        // Still running – wait and poll again
        await sleep(pollIntervalMs);
        continue;
      }
      return history;
    }
    await sleep(pollIntervalMs);
  }

  throw new Error(`ComfyUI job ${promptId} timed out after ${timeoutMs}ms`);
}

// -------------------------------------------------------------------
// Fetch /history for a specific prompt
// -------------------------------------------------------------------

export async function fetchHistory(
  promptId: string
): Promise<ComfyHistoryItem | null> {
  const res = await fetch(`${COMFYUI_API_URL}/history/${promptId}`);
  if (!res.ok) return null;

  const data = (await res.json()) as Record<string, ComfyHistoryItem>;
  return data[promptId] ?? null;
}

// -------------------------------------------------------------------
// Fetch /queue status
// -------------------------------------------------------------------

export async function fetchQueueStatus(): Promise<ComfyQueueStatus> {
  const res = await fetch(`${COMFYUI_API_URL}/queue`);
  if (!res.ok) throw new Error(`ComfyUI /queue error ${res.status}`);
  return (await res.json()) as ComfyQueueStatus;
}

// -------------------------------------------------------------------
// Build an image URL from a ComfyUI output image descriptor
// -------------------------------------------------------------------

export function buildImageUrl(
  filename: string,
  subfolder: string,
  type: string
): string {
  const params = new URLSearchParams({ filename, subfolder, type });
  return `${COMFYUI_API_URL}/view?${params.toString()}`;
}

// -------------------------------------------------------------------
// Extract output image URLs from a history item
// -------------------------------------------------------------------

export function extractImageUrls(history: ComfyHistoryItem): string[] {
  const urls: string[] = [];
  for (const nodeOutput of Object.values(history.outputs)) {
    if (nodeOutput.images) {
      for (const img of nodeOutput.images) {
        urls.push(buildImageUrl(img.filename, img.subfolder, img.type));
      }
    }
  }
  return urls;
}

// -------------------------------------------------------------------
// High-level: submit workflow and wait, with retry
// -------------------------------------------------------------------

export async function generateImages(
  workflow: Record<string, unknown>,
  retries = 2
): Promise<GenerationResult> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const submitted = await submitPrompt(workflow);
      const history = await waitForCompletion(submitted.prompt_id);
      const images = extractImageUrls(history);

      return { images, promptId: submitted.prompt_id };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < retries) {
        // Exponential back-off: 2s, 4s, …
        await sleep(2000 * Math.pow(2, attempt));
      }
    }
  }

  throw lastError ?? new Error("Unknown generation error");
}

// -------------------------------------------------------------------
// Mock mode – returns placeholder images for development
// -------------------------------------------------------------------

const MOCK_PLACEHOLDER =
  "https://placehold.co/512x512/1a1a2e/eee?text=FLUX+Mock";

export async function generateImagesMock(count: number): Promise<GenerationResult> {
  // Simulate generation delay
  await sleep(1500);
  const images = Array.from({ length: count }, (_, i) =>
    `https://placehold.co/512x512/1a1a2e/eee?text=Panel+${i + 1}`
  );
  return { images, promptId: `mock-${Date.now()}` };
}

export { MOCK_PLACEHOLDER };

// -------------------------------------------------------------------
// Utility
// -------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
