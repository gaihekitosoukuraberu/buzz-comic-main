// Application constants
export const APP_NAME = "Buzz Comic";
export const APP_DESCRIPTION = "AIを活用したバズるコミック生成プラットフォーム";

// File upload
export const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE ?? "52428800"); // 50MB
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
export const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
export const UPLOAD_DIR = process.env.UPLOAD_DIR ?? "./public/uploads";

// Scoring / cull thresholds
export const SCORE_CULL_THRESHOLD = parseInt(
  process.env.SCORE_CULL_THRESHOLD ?? "10"
);
export const SCORE_CULL_DAYS = parseInt(process.env.SCORE_CULL_DAYS ?? "30");

// ComfyUI
export const COMFYUI_API_URL =
  process.env.COMFYUI_API_URL ?? "http://localhost:8188";
export const FLUX_MODEL =
  process.env.FLUX_MODEL ?? "flux1-dev.safetensors";

// Pagination
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// Queue names
export const QUEUE_IMAGE_GENERATION = "image-generation";
export const QUEUE_VIDEO_GENERATION = "video-generation";
export const QUEUE_SOCIAL_POSTING = "social-posting";

// Cache TTL (seconds)
export const CACHE_TTL_SHORT = 60;         // 1 minute
export const CACHE_TTL_MEDIUM = 60 * 5;   // 5 minutes
export const CACHE_TTL_LONG = 60 * 60;    // 1 hour

// Revenue (NOTE: rates are not finalized — confirm before production)
// See also: src/lib/revenue.ts
export const REVENUE_CPM_RATE = parseFloat(process.env.REVENUE_CPM_RATE ?? "0.5");   // 円/1000ビュー
export const REVENUE_MIN_PAYOUT = parseFloat(process.env.REVENUE_MIN_PAYOUT ?? "1000"); // 最低振込額（円）
export const REVENUE_PAYOUT_DAY = 25; // 毎月の振込予定日
