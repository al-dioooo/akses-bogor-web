// Potongan gambar seperti `object-fit: cover`, dipakai poster dan kanvas supaya keduanya memotong bingkai yang sama.
// Tanpa three.js, jadi boleh dimuat lebih awal oleh komponen.

/** Bagian bingkai yang terlihat, pecahan 0..1 dari kiri dan atas bingkai penuh. */
export type Crop = { x: number; y: number; w: number; h: number };

export const FULL: Crop = { x: 0, y: 0, w: 1, h: 1 };

/** Bagian bingkai berasio `frame` yang terlihat di kotak berasio `box`, dengan object-position (px, py) dalam 0..1. */
export function coverCrop(frame: number, box: number, px: number, py: number): Crop {
  if (box > frame) {
    const h = frame / box;
    return { x: 0, y: (1 - h) * py, w: 1, h };
  }
  const w = box / frame;
  return { x: (1 - w) * px, y: 0, w, h: 1 };
}

/** object-position sebuah gambar, mis. "86% 70%", sebagai pecahan 0..1. */
export function objectPosition(image: HTMLElement): [number, number] {
  const [px, py] = getComputedStyle(image).objectPosition.split(" ").map((part) => parseFloat(part) / 100);
  return [Number.isFinite(px) ? px : 0.5, Number.isFinite(py) ? py : 0.5];
}

/** Titik (u, v) di bingkai penuh menjadi posisi di kotak, dalam persen lebar dan tinggi kotak. */
export function toBox(crop: Crop, u: number, v: number): [string, string] {
  return [(((u - crop.x) / crop.w) * 100).toFixed(2), (((v - crop.y) / crop.h) * 100).toFixed(2)];
}
