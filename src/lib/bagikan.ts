/** Hasil membagikan tautan lokasi (FR-08). */
export type ShareResult = "shared" | "cancelled" | "copied" | "failed";

/** Bagian `navigator` yang dipakai, supaya tes bisa memberi tiruan. */
export type ShareNavigator = {
  share?: (data: ShareData) => Promise<void>;
  canShare?: (data: ShareData) => boolean;
  clipboard?: { writeText?: (text: string) => Promise<void> };
};

/**
 * Alamat halaman lokasi yang dibagikan: asal situs dan path lokasi saja, tanpa query, hash, atau parameter pelacak,
 * sehingga alamat yang dibagikan selalu sama untuk lokasi yang sama.
 */
export function placeUrl(origin: string, id: string) {
  return new URL(`/lokasi/${encodeURIComponent(id)}`, origin).href;
}

/**
 * Membagikan tautan lewat lembar berbagi perangkat (Web Share API) bila ada. Bila tidak ada atau gagal, tautan
 * disalin ke clipboard. Membatalkan lembar berbagi tidak dihitung gagal dan tidak menyalin apa-apa.
 */
export async function shareLink(data: { title: string; url: string }, nav: ShareNavigator): Promise<ShareResult> {
  const payload: ShareData = { title: data.title, url: data.url };
  if (typeof nav.share === "function" && (typeof nav.canShare !== "function" || nav.canShare(payload))) {
    try {
      await nav.share(payload);
      return "shared";
    } catch (error) {
      // Browser melempar DOMException; namanya dibaca langsung karena tidak semua browser menurunkannya dari Error.
      if ((error as { name?: unknown } | null)?.name === "AbortError") return "cancelled";
      // Mis. NotAllowedError di iframe atau tanpa izin: lanjut menyalin.
    }
  }
  if (typeof nav.clipboard?.writeText !== "function") return "failed";
  try {
    await nav.clipboard.writeText(data.url);
    return "copied";
  } catch {
    return "failed";
  }
}
