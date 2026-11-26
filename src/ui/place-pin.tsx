import type { Category, Status } from "@/lib/api";
import { CATEGORY_ICON } from "./place-icons";
import { StatusPin } from "./status-pin";

/**
 * Map marker tempat yang tayang (ADR-0053): lingkaran berwarna status berisi ikon kategori, ikon yang sama dengan chip
 * filter, dan lencana status kecil (warna dan ikon status) di kanan bawah, supaya status tidak hanya ditandai warna.
 * Dekoratif: status dan kategori ditulis di nama tombol atau teks sebelahnya.
 */
export function PlacePin({ place, className = "size-8" }: { place: { status: Status; category: Category }; className?: string }) {
  return (
    <span aria-hidden="true" className={`relative shrink-0 ${className}`}>
      <StatusPin status={place.status} icon={CATEGORY_ICON[place.category]} className="size-full" />
      <StatusPin status={place.status} className="absolute -right-1.5 -bottom-1.5 size-[56%] min-h-4.5 min-w-4.5" />
    </span>
  );
}
