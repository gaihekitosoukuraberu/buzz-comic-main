import fs from "fs/promises";
import path from "path";
import sharp from "sharp";
import { UPLOAD_DIR } from "./constants";

export interface StoredFile {
  url: string;
  width: number;
  height: number;
  filePath: string;
}

/**
 * Ensure a directory exists, creating it recursively if needed.
 */
async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

/**
 * Generate a UUID-based filename preserving the original extension.
 */
function generateFilename(originalName: string): string {
  const ext = path.extname(originalName).toLowerCase() || ".jpg";
  return `${crypto.randomUUID()}${ext}`;
}

/**
 * Resolve the absolute filesystem path for a given relative upload path.
 */
function resolveUploadPath(relativePath: string): string {
  // UPLOAD_DIR is relative to cwd (project root), e.g. "./public/uploads"
  return path.resolve(process.cwd(), UPLOAD_DIR, relativePath);
}

/**
 * Convert an absolute filesystem path to a public URL path.
 * e.g. /project/public/uploads/mangas/123/panels/abc.jpg -> /uploads/mangas/123/panels/abc.jpg
 */
function toPublicUrl(absolutePath: string): string {
  const publicDir = path.resolve(process.cwd(), "public");
  return absolutePath.replace(publicDir, "");
}

export type UploadType = "panel" | "cover";

/**
 * Save an uploaded image file to disk, resize/optimize it with sharp,
 * and return the public URL plus dimensions.
 */
export async function saveImage(
  fileBuffer: Buffer,
  originalName: string,
  mangaId: string,
  type: UploadType
): Promise<StoredFile> {
  const subDir = type === "cover" ? "covers" : "panels";
  const relativeDir = path.join("mangas", mangaId, subDir);
  const absoluteDir = resolveUploadPath(relativeDir);

  await ensureDir(absoluteDir);

  const filename = generateFilename(originalName);
  const absoluteFilePath = path.join(absoluteDir, filename);

  // Determine output format from extension
  const ext = path.extname(filename).toLowerCase();

  let sharpInstance = sharp(fileBuffer);

  // Apply format-specific optimisation
  if (ext === ".jpg" || ext === ".jpeg") {
    sharpInstance = sharpInstance.jpeg({ quality: 85, progressive: true });
  } else if (ext === ".png") {
    sharpInstance = sharpInstance.png({ compressionLevel: 8 });
  } else if (ext === ".webp") {
    sharpInstance = sharpInstance.webp({ quality: 85 });
  }

  // Write to disk and capture metadata
  const { data, info } = await sharpInstance.toBuffer({ resolveWithObject: true });
  await fs.writeFile(absoluteFilePath, data);

  const publicUrl = toPublicUrl(absoluteFilePath);

  return {
    url: publicUrl,
    width: info.width,
    height: info.height,
    filePath: absoluteFilePath,
  };
}

/**
 * Delete an image file from disk given its public URL.
 */
export async function deleteImage(publicUrl: string): Promise<void> {
  const publicDir = path.resolve(process.cwd(), "public");
  const absolutePath = path.join(publicDir, publicUrl);
  try {
    await fs.unlink(absolutePath);
  } catch {
    // Ignore errors if file does not exist
  }
}

/**
 * Delete all images for a given manga (panels + covers directories).
 */
export async function deleteMangaImages(mangaId: string): Promise<void> {
  const mangaDir = resolveUploadPath(path.join("mangas", mangaId));
  try {
    await fs.rm(mangaDir, { recursive: true, force: true });
  } catch {
    // Ignore errors
  }
}
