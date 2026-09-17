import { MAX_IMAGE_PIXELS, MAX_UPLOAD_MB } from "@/lib/config";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function validateImage(file: File): Promise<{ width: number; height: number }> {
  if (!ALLOWED.has(file.type)) throw new Error("Choose a JPG, PNG, or WebP image.");
  if (file.size > MAX_UPLOAD_MB * 1024 * 1024) throw new Error(`Images must be under ${MAX_UPLOAD_MB} MB.`);
  if (file.size === 0) throw new Error("The selected file is empty.");
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("This image could not be opened. Choose a valid JPG, PNG, or WebP file.");
  }
  const size = { width: bitmap.width, height: bitmap.height };
  bitmap.close();
  if (size.width * size.height > MAX_IMAGE_PIXELS)
    throw new Error(`Images must be under ${Math.round(MAX_IMAGE_PIXELS / 1_000_000)} megapixels.`);
  return size;
}

export function outputName(filename: string, suffix: string, extension: "png" | "webp"): string {
  const stem =
    filename
      .replace(/\.[^.]+$/, "")
      .replace(/[^a-zA-Z0-9_-]+/g, "-")
      .slice(0, 80) || "image";
  return `${stem}-${suffix}.${extension}`;
}
