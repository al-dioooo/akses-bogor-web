// Foto diperkecil di browser sebelum disimpan di draf dan diunggah (ADR-0023, ADR-0031): sisi terpanjang maksimal
// 2048 px, JPEG kualitas 0,8. JPEG dipakai karena Safari belum bisa menyimpan WebP dari canvas. Server tetap memeriksa
// dan menyandikan ulang foto, jadi langkah ini untuk menghemat data seluler, bukan untuk keamanan.

export const MAX_RAW_BYTES = 20 * 1024 * 1024;
export const MAX_SIDE = 2048;
const QUALITY = 0.8;
/** HEIC diterima bila browser bisa membacanya (Safari); hasilnya tetap JPEG. */
const ACCEPTED = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif", ""]);
export const ACCEPT_ATTRIBUTE = "image/jpeg,image/png,image/webp";

export type PhotoProblem = "jenis" | "terlaluBesar" | "tidakTerbaca";

export class PhotoError extends Error {
  constructor(readonly problem: PhotoProblem) {
    super(problem);
    this.name = "PhotoError";
  }
}

/** Ukuran baru yang muat dalam `max` × `max` tanpa memperbesar. */
export function fitWithin(width: number, height: number, max = MAX_SIDE) {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

/** Pemeriksaan sebelum foto dibaca: jenis berkas dan 20 MB mentah. */
export function checkFile(file: Pick<File, "type" | "size">): PhotoProblem | null {
  if (!ACCEPTED.has(file.type)) return "jenis";
  if (file.size > MAX_RAW_BYTES) return "terlaluBesar";
  return null;
}

/** Membaca foto, memutarnya sesuai orientasi kamera, memperkecil, lalu menyimpannya sebagai JPEG tanpa metadata. */
export async function shrinkPhoto(file: File): Promise<{ blob: Blob; width: number; height: number }> {
  const problem = checkFile(file);
  if (problem) throw new PhotoError(problem);
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new PhotoError("tidakTerbaca");
  }
  const size = fitWithin(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext("2d");
  if (!context) throw new PhotoError("tidakTerbaca");
  // Latar putih untuk PNG transparan, karena JPEG tidak punya transparansi.
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, size.width, size.height);
  context.drawImage(bitmap, 0, 0, size.width, size.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", QUALITY));
  if (!blob) throw new PhotoError("tidakTerbaca");
  return { blob, ...size };
}
