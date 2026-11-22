/** Jarak dalam piksel dari tepi kanvas peta yang tertutup panel atau kontrol yang mengambang di atasnya. */
export type Insets = { top: number; right: number; bottom: number; left: number };

export const NO_INSETS: Insets = { top: 0, right: 0, bottom: 0, left: 0 };

/** Persegi kanvas yang benar-benar terlihat, atau null bila panel menutup seluruh peta. */
export function visibleRect(width: number, height: number, insets: Insets) {
  const left = Math.max(0, insets.left);
  const top = Math.max(0, insets.top);
  const right = width - Math.max(0, insets.right);
  const bottom = height - Math.max(0, insets.bottom);
  return right - left >= 1 && bottom - top >= 1 ? { left, top, right, bottom } : null;
}

/**
 * Padding untuk fitBounds dan flyTo: bagian yang tertutup ditambah `margin`. Bila sisa kanvas terlalu sempit untuk
 * memuat seluruh Kota Bogor, padding hanya `margin`, supaya Mapbox tidak menolak perpindahannya.
 */
export function cameraPadding(width: number, height: number, insets: Insets, margin = 16): Insets {
  const padded = {
    top: Math.max(0, insets.top) + margin,
    right: Math.max(0, insets.right) + margin,
    bottom: Math.max(0, insets.bottom) + margin,
    left: Math.max(0, insets.left) + margin,
  };
  const roomy = width - padded.left - padded.right >= 80 && height - padded.top - padded.bottom >= 80;
  return roomy ? padded : { top: margin, right: margin, bottom: margin, left: margin };
}
