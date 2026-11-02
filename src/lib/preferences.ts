// Preferensi tampilan yang dibaca adegan Beranda dan peta: gerak mengikuti perangkat dan tombol "Kurangi gerakan" di header,
// mode warna mengikuti perangkat atau <html data-theme>, dan warna latar halaman untuk kabut adegan.

export type Theme = { night: boolean; background: string };

export const motionReduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.dataset.motion === "off";

export function readTheme(): Theme {
  const forced = document.documentElement.dataset.theme;
  const night = forced ? forced === "gelap" : matchMedia("(prefers-color-scheme: dark)").matches;
  const background = getComputedStyle(document.documentElement).getPropertyValue("--color-bg-canvas").trim();
  return { night, background: background || (night ? "#12131A" : "#F9F9F7") };
}

/** Memanggil `sync` saat preferensi gerak, mode warna, atau keaktifan tab berubah. Mengembalikan fungsi pelepas. */
export function watchPreferences(sync: () => void) {
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const scheme = matchMedia("(prefers-color-scheme: dark)");
  motion.addEventListener("change", sync);
  scheme.addEventListener("change", sync);
  document.addEventListener("visibilitychange", sync);
  const attributes = new MutationObserver(sync);
  attributes.observe(document.documentElement, { attributeFilter: ["data-motion", "data-theme"] });
  return () => {
    motion.removeEventListener("change", sync);
    scheme.removeEventListener("change", sync);
    document.removeEventListener("visibilitychange", sync);
    attributes.disconnect();
  };
}

/** Benar bila browser bisa membuat konteks WebGL; tanpa itu three.js tidak perlu diunduh. */
export function hasWebGL() {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
    return !!gl;
  } catch {
    return false;
  }
}
