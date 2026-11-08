// Shrinks a photo to a small JPEG (a "data URL") so an application's ID and
// selfie can be kept for the admin to look at without filling up the browser's
// storage. A phone photo is several MB; this is typically 40–120 KB, still
// perfectly readable for checking a card.

export const MAX_PHOTO_SIDE = 800;
export const PHOTO_QUALITY = 0.65;
const MAX_INPUT_BYTES = 25 * 1024 * 1024;

export async function compressImage(
  file: File,
  maxSide = MAX_PHOTO_SIDE,
  quality = PHOTO_QUALITY,
): Promise<string | null> {
  if (!file.type.startsWith("image/") || file.size > MAX_INPUT_BYTES) return null;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();
    return canvas.toDataURL("image/jpeg", quality);
  } catch {
    return null;
  }
}
