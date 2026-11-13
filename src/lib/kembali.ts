// Halaman tujuan setelah masuk (FR-20): "Laporkan tempat" mengirim pengguna ke /masuk?kembali=/laporkan, lalu
// pengguna kembali ke formulir setelah masuk.

/** Tujuan bawaan setelah masuk. */
export const AFTER_SIGN_IN = "/akun";

/**
 * Hanya alamat di situs ini yang diterima, supaya `kembali` tidak bisa dipakai untuk mengarahkan pengguna ke situs
 * lain. Halaman masuk sendiri tidak diterima supaya tidak berputar.
 */
export function safeReturnPath(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 512) return null;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return null;
  if (/[\u0000-\u001f\u007f\\]/.test(value)) return null;
  const path = value.split(/[?#]/)[0]!;
  if (path === "/masuk" || path.startsWith("/masuk/")) return null;
  return value;
}

/** Menambahkan `kembali` ke alamat halaman masuk bila ada. */
export function withReturn(path: string, kembali: string | null) {
  return kembali ? `${path}?kembali=${encodeURIComponent(kembali)}` : path;
}
