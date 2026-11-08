/**
 * Kode yang ditempel atau diisi otomatis boleh berisi spasi, tanda hubung, atau angka lebar penuh dari keyboard
 * tertentu. Semuanya diubah menjadi angka biasa sebelum dikirim ke API.
 */
export function normalizeCode(value: string) {
  return value.normalize("NFKC").replace(/[\s-]/g, "");
}
