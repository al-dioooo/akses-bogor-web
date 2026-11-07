// Kolom isian (ADR-0027): tinggi 52 px, garis tebal, dan garis merah tebal saat galat. Galat juga selalu ditulis
// sebagai teks dengan ikon di bawah kolom, tidak hanya warna.
export function fieldClass(invalid = false, extra = "") {
  return (
    "min-h-13 w-full rounded-2xl border-2 bg-surface-field px-4 text-base text-text-primary placeholder:text-text-secondary " +
    (invalid ? "border-border-error " : "border-border-field ") +
    extra
  ).trim();
}
