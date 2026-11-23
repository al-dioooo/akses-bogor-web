import type { Category } from "@/lib/api";
import { Icon } from "./icon";
import { CATEGORY_ICON } from "./place-icons";

/**
 * Warna kategori (issue #199). Status tetap tanda aksesibilitas; warna kategori hanya membantu membedakan jenis tempat
 * dan selalu datang bersama ikon kategorinya, jadi tidak pernah menjadi satu-satunya tanda (WCAG 1.4.1).
 */
export const CATEGORY_SOLID: Record<Category, string> = {
  kampus: "bg-category-kampus",
  masjid: "bg-category-masjid",
  halte: "bg-category-halte",
  rumah_sakit: "bg-category-rumah-sakit",
};

export const CATEGORY_BORDER: Record<Category, string> = {
  kampus: "border-category-kampus",
  masjid: "border-category-masjid",
  halte: "border-category-halte",
  rumah_sakit: "border-category-rumah-sakit",
};

/** Nama variabel CSS warna kategori, untuk lapisan GL peta yang membaca warnanya dari CSS. */
export const CATEGORY_VAR: Record<Category, string> = {
  kampus: "--color-category-kampus",
  masjid: "--color-category-masjid",
  halte: "--color-category-halte",
  rumah_sakit: "--color-category-rumah-sakit",
};

/**
 * Lencana kategori: lingkaran berwarna kategori dengan ikon kategori dan cincin putih seperti Map marker. Dekoratif:
 * nama kategori ditulis di teks sebelahnya atau di nama tombol marker.
 */
export function CategoryPin({ category, className = "size-6" }: { category: Category; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center rounded-full border-2 border-marker-ring text-category-on shadow-[0_0_0_1px_var(--color-border-strong)] ${CATEGORY_SOLID[category]} ${className}`}
    >
      <Icon icon={CATEGORY_ICON[category]} className="size-[62%]" />
    </span>
  );
}
