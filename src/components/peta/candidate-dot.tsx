import type { Category } from "@/lib/api";
import { CATEGORY_BORDER } from "@/ui/category-pin";

/**
 * Bentuk kandidat "Belum ada data" (ADR-0049) di legenda, daftar, dan kartu: lingkaran berlubang, sama dengan lapisan di
 * peta dan berbeda dari keempat marker status yang berisi warna dan ikon. Bergaris warna kategorinya bila diberi
 * `category` (issue #199), abu-abu bila tidak. Dekoratif; teksnya selalu ada di sebelahnya.
 */
export function CandidateDot({ category, className = "size-4" }: { category?: Category; className?: string }) {
  const border = category ? CATEGORY_BORDER[category] : "border-icon-secondary";
  return <span aria-hidden="true" className={`inline-block shrink-0 rounded-full border-[2.5px] bg-bg-canvas ${border} ${className}`} />;
}
