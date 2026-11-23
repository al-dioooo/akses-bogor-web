import type { Category, Status } from "@/lib/api";
import { CategoryPin } from "./category-pin";
import { StatusPin } from "./status-pin";

/**
 * Map marker tempat yang tayang: lingkaran status (warna dan ikon status, ADR-0027) dengan lencana kategori kecil di
 * kanan bawah (issue #199). Dekoratif: status dan kategori ditulis di nama tombol atau teks sebelahnya.
 */
export function PlacePin({ place, className = "size-8" }: { place: { status: Status; category: Category }; className?: string }) {
  return (
    <span aria-hidden="true" className={`relative shrink-0 ${className}`}>
      <StatusPin status={place.status} className="size-full" />
      <CategoryPin category={place.category} className="absolute -right-1.5 -bottom-1.5 size-[60%] min-w-4.5 min-h-4.5" />
    </span>
  );
}
