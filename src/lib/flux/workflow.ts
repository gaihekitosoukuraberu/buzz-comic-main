/**
 * FLUX.2 ComfyUI workflow templates.
 *
 * Each workflow is a ComfyUI API-format JSON graph.
 * Node IDs are strings; node classes map to ComfyUI built-in nodes.
 */

import { FLUX_MODEL } from "@/lib/constants";

export type MangaStyle = "anime" | "realistic" | "monochrome";

export interface WorkflowOptions {
  prompt: string;
  negativePrompt?: string;
  style: MangaStyle;
  width?: number;
  height?: number;
  steps?: number;
  cfg?: number;
  seed?: number;
}

// -------------------------------------------------------------------
// Style prompts appended to the user prompt
// -------------------------------------------------------------------

const STYLE_SUFFIXES: Record<MangaStyle, string> = {
  anime:
    "anime style, manga illustration, cel shading, vibrant colors, clean linework, Japanese anime aesthetics",
  realistic:
    "hyperrealistic, photorealistic, detailed shading, cinematic lighting, high detail",
  monochrome:
    "black and white manga, ink illustration, hatching, monochrome, high contrast, manga panel style",
};

const NEGATIVE_BASE =
  "blurry, low quality, watermark, text, signature, deformed, ugly, bad anatomy, nsfw";

// -------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------

function randomSeed(): number {
  return Math.floor(Math.random() * 2 ** 32);
}

function buildPromptText(opts: WorkflowOptions): string {
  const suffix = STYLE_SUFFIXES[opts.style];
  return `${opts.prompt}, ${suffix}`;
}

// -------------------------------------------------------------------
// manga_panel workflow – single panel, 512×768 portrait
// -------------------------------------------------------------------

export function mangaPanelWorkflow(opts: WorkflowOptions): Record<string, unknown> {
  const {
    width = 512,
    height = 768,
    steps = 20,
    cfg = 3.5,
    seed = randomSeed(),
    negativePrompt = NEGATIVE_BASE,
  } = opts;

  const positiveText = buildPromptText(opts);

  return {
    "1": {
      class_type: "CheckpointLoaderSimple",
      inputs: {
        ckpt_name: FLUX_MODEL,
      },
    },
    "2": {
      class_type: "CLIPTextEncode",
      inputs: {
        text: positiveText,
        clip: ["1", 1],
      },
    },
    "3": {
      class_type: "CLIPTextEncode",
      inputs: {
        text: negativePrompt,
        clip: ["1", 1],
      },
    },
    "4": {
      class_type: "EmptyLatentImage",
      inputs: {
        width,
        height,
        batch_size: 1,
      },
    },
    "5": {
      class_type: "KSampler",
      inputs: {
        seed,
        steps,
        cfg,
        sampler_name: "euler",
        scheduler: "simple",
        denoise: 1.0,
        model: ["1", 0],
        positive: ["2", 0],
        negative: ["3", 0],
        latent_image: ["4", 0],
      },
    },
    "6": {
      class_type: "VAEDecode",
      inputs: {
        samples: ["5", 0],
        vae: ["1", 2],
      },
    },
    "7": {
      class_type: "SaveImage",
      inputs: {
        filename_prefix: "buzz_panel",
        images: ["6", 0],
      },
    },
  };
}

// -------------------------------------------------------------------
// manga_cover workflow – landscape/cover 768×512 with higher quality
// -------------------------------------------------------------------

export function mangaCoverWorkflow(opts: WorkflowOptions): Record<string, unknown> {
  return mangaPanelWorkflow({
    ...opts,
    width: 768,
    height: 512,
    steps: 28,
    cfg: 4.0,
  });
}

// -------------------------------------------------------------------
// style workflow – same panel but with LoRA applied
// Currently uses a no-op LoRA node; replace LoRA name with your model.
// -------------------------------------------------------------------

export function styledWorkflow(
  opts: WorkflowOptions,
  loraName = "anime_manga_lora.safetensors",
  loraStrength = 0.8
): Record<string, unknown> {
  const base = mangaPanelWorkflow(opts) as Record<string, Record<string, unknown>>;

  // Insert a LoRALoader between CheckpointLoader (node "1") and KSampler (node "5")
  const withLora: Record<string, unknown> = {
    ...base,
    "1_lora": {
      class_type: "LoraLoader",
      inputs: {
        model: ["1", 0],
        clip: ["1", 1],
        lora_name: loraName,
        strength_model: loraStrength,
        strength_clip: loraStrength,
      },
    },
  };

  // Patch KSampler to use LoRA model output and patch CLIPTextEncode to use LoRA clip
  (withLora["5"] as Record<string, Record<string, unknown>>).inputs = {
    ...((base["5"] as Record<string, unknown>).inputs as Record<string, unknown>),
    model: ["1_lora", 0],
  };
  (withLora["2"] as Record<string, Record<string, unknown>>).inputs = {
    ...((base["2"] as Record<string, unknown>).inputs as Record<string, unknown>),
    clip: ["1_lora", 1],
  };
  (withLora["3"] as Record<string, Record<string, unknown>>).inputs = {
    ...((base["3"] as Record<string, unknown>).inputs as Record<string, unknown>),
    clip: ["1_lora", 1],
  };

  return withLora;
}

// -------------------------------------------------------------------
// Factory: choose workflow by type
// -------------------------------------------------------------------

export type WorkflowType = "manga_panel" | "manga_cover" | "style";

export function buildWorkflow(
  type: WorkflowType,
  opts: WorkflowOptions
): Record<string, unknown> {
  switch (type) {
    case "manga_panel":
      return mangaPanelWorkflow(opts);
    case "manga_cover":
      return mangaCoverWorkflow(opts);
    case "style":
      return styledWorkflow(opts);
    default:
      return mangaPanelWorkflow(opts);
  }
}
