import type { BlurRegion } from "@/lib/verifikasi";

// Geometri area kabur (ADR-0037), dalam pecahan 0 sampai 1 dari lebar dan tinggi foto, sama dengan API.

/** Paling banyak area per foto, sama dengan API. */
export const MAX_AREAS = 20;
/** Satu tekan panah menggeser atau mengubah ukuran sebesar ini (2% foto). */
export const STEP = 0.02;
/** Area lebih kecil dari ini tidak berguna dan diabaikan saat menyeret. */
export const MIN_SIZE = 0.02;

const round = (value: number) => Math.round(value * 10_000) / 10_000;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Area yang dipotong supaya tetap di dalam foto dan tidak lebih kecil dari batas minimum. */
export function clampArea({ x, y, w, h }: BlurRegion): BlurRegion {
  const width = clamp(w, MIN_SIZE, 1);
  const height = clamp(h, MIN_SIZE, 1);
  return { x: round(clamp(x, 0, 1 - width)), y: round(clamp(y, 0, 1 - height)), w: round(width), h: round(height) };
}

/** Area baru di tengah foto, untuk tombol Tambah area. */
export const centeredArea = (): BlurRegion => ({ x: 0.4, y: 0.4, w: 0.2, h: 0.2 });

/** Area dari titik awal dan akhir seretan, atau null bila terlalu kecil. */
export function areaFromDrag(start: { x: number; y: number }, end: { x: number; y: number }): BlurRegion | null {
  const x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);
  const w = Math.abs(end.x - start.x);
  const h = Math.abs(end.y - start.y);
  if (w < MIN_SIZE || h < MIN_SIZE) return null;
  return clampArea({ x, y, w, h });
}

const ARROWS: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };

/** Tombol panah menggeser area; Shift + panah mengubah lebar dan tinggi. Null bila tombolnya bukan panah. */
export function areaFromKey(area: BlurRegion, key: string, resize: boolean): BlurRegion | null {
  const arrow = ARROWS[key];
  if (!arrow) return null;
  const [dx, dy] = arrow;
  if (resize) return clampArea({ ...area, w: area.w + dx * STEP, h: area.h + dy * STEP });
  return clampArea({ ...area, x: area.x + dx * STEP, y: area.y + dy * STEP });
}

/** Persen bulat untuk label dan kolom angka. */
export const percent = (value: number) => Math.round(value * 100);
