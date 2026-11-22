import mapboxgl, { type GeoJSONSource, type LngLatBoundsLike } from "mapbox-gl";
import type { DistrictBoundaries, MapToken, PriorityLevel } from "@/lib/api";
import { LEVEL_COLOR, LEVELS } from "@/components/prioritas/levels";
import { motionReduced } from "@/lib/preferences";
import type { MapPlace } from "../places";

/** Tampilan awal: seluruh Kota Bogor (ADR-0010). */
const KOTA_BOGOR: LngLatBoundsLike = [
  [106.72, -6.69],
  [106.86, -6.5],
];
// Peta tidak bisa digeser terlalu jauh dari Kota Bogor.
const AREA: LngLatBoundsLike = [
  [106.5, -6.9],
  [107.1, -6.3],
];
const STYLE = { terang: "mapbox://styles/mapbox/light-v11", gelap: "mapbox://styles/mapbox/dark-v11" };
// Token baru diminta lima menit sebelum kedaluwarsa; bila gagal, dicoba lagi tiap menit.
const RENEW_BEFORE_MS = 5 * 60_000;
const RETRY_MS = 60_000;

export type MapHandle = {
  /** Tombol marker per id lokasi; isinya digambar komponen React lewat portal. */
  markers: Map<string, HTMLButtonElement>;
  zoomIn(): void;
  zoomOut(): void;
  reset(): void;
  show(id: string): void;
  setSelected(id: string | null): void;
  setNight(night: boolean): void;
  /** Lapisan prioritas kecamatan: batas dengan tingkatnya, atau null untuk menyembunyikannya. */
  setPriority(districts: { boundaries: DistrictBoundaries; levels: Record<string, PriorityLevel> } | null): void;
  destroy(): void;
};

type Options = {
  container: HTMLElement;
  token: MapToken;
  renewToken: () => Promise<MapToken>;
  places: MapPlace[];
  night: boolean;
  locale: Record<string, string>;
  /** Id teks petunjuk keyboard untuk kanvas peta. */
  describedBy: string;
  markerLabel: (place: MapPlace) => string;
  onReady: () => void;
  onFail: () => void;
  onView: (ids: string[]) => void;
  onSelect: (id: string) => void;
};

/** Mengganti token di URL Mapbox dengan token terbaru, termasuk URL tile dari TileJSON yang membawa token lama. */
function withToken(url: string, token: string) {
  if (!/^https:\/\/([a-z0-9-]+\.)*mapbox\.com\//.test(url) || !url.includes("access_token=")) return url;
  const next = new URL(url);
  next.searchParams.set("access_token", token);
  return next.toString();
}

/** Peta Mapbox GL JS untuk halaman Peta (ADR-0016): marker HTML berupa tombol, tanpa rotasi dan kemiringan. */
export function mountMap(options: Options): MapHandle {
  const { places } = options;
  let token = options.token;
  let night = options.night;
  let ready = false;
  mapboxgl.accessToken = token.token;

  const map = new mapboxgl.Map({
    container: options.container,
    style: night ? STYLE.gelap : STYLE.terang,
    bounds: KOTA_BOGOR,
    fitBoundsOptions: { padding: 16 },
    maxBounds: AREA,
    minZoom: 10,
    maxZoom: 18,
    dragRotate: false,
    pitchWithRotate: false,
    touchPitch: false,
    // Peta ada di tengah halaman: satu jari dan roda tetikus tetap menggulir halaman.
    cooperativeGestures: true,
    locale: options.locale,
    // Atribusi selalu tampil penuh, juga di ponsel yang biasanya hanya mendapat tombol "i" (ADR-0016).
    attributionControl: false,
    transformRequest: (url) => ({ url: withToken(url, token.token) }),
  });
  map.addControl(new mapboxgl.AttributionControl({ compact: false }), "bottom-right");
  map.touchZoomRotate.disableRotation();
  map.keyboard.disableRotation();
  // Mapbox hanya membaca prefers-reduced-motion; "Kurangi gerakan" di header juga harus mematikan animasi peta.
  map._prefersReducedMotion = (animation) => motionReduced() && !animation?.essential;
  map.getCanvas().setAttribute("aria-describedby", options.describedBy);

  const markers = new Map<string, HTMLButtonElement>();
  for (const place of places) {
    const button = document.createElement("button");
    button.type = "button";
    // role ditulis eksplisit karena Mapbox memberi role="img" pada marker yang belum punya role.
    button.setAttribute("role", "button");
    button.setAttribute("aria-label", options.markerLabel(place));
    button.setAttribute("aria-expanded", "false");
    button.className = "grid size-11 cursor-pointer place-items-center rounded-full";
    button.addEventListener("click", () => options.onSelect(place.id));
    new mapboxgl.Marker({ element: button }).setLngLat([place.lng, place.lat]).addTo(map);
    markers.set(place.id, button);
  }

  // Marker di luar tampilan keluar dari urutan Tab dan disembunyikan dari pembaca layar; daftar ikut tampilan.
  const updateView = () => {
    const bounds = map.getBounds();
    const ids: string[] = [];
    for (const place of places) {
      const inside = bounds?.contains([place.lng, place.lat]) ?? false;
      const button = markers.get(place.id)!;
      button.tabIndex = inside ? 0 : -1;
      if (inside) {
        button.removeAttribute("aria-hidden");
        ids.push(place.id);
      } else {
        button.setAttribute("aria-hidden", "true");
      }
    }
    options.onView(ids);
  };
  map.on("load", () => {
    ready = true;
    updateView();
    options.onReady();
  });
  map.on("moveend", updateView);
  // Galat sebelum gaya peta termuat (mis. token ditolak) berarti peta gagal; galat satu tile sesudahnya diabaikan.
  map.on("error", () => {
    if (!ready && !map.isStyleLoaded()) options.onFail();
  });

  // Lapisan prioritas digambar di bawah label peta dasar dan di bawah marker (marker berupa elemen HTML). Gaya baru
  // (tema berganti) menghapus semua lapisan, jadi lapisan digambar ulang setiap kali gaya selesai dimuat.
  let priority: Parameters<MapHandle["setPriority"]>[0] = null;
  const drawPriority = () => {
    if (!map.isStyleLoaded()) return;
    if (!priority) {
      for (const id of ["prioritas-garis", "prioritas-isi"]) if (map.getLayer(id)) map.removeLayer(id);
      if (map.getSource("prioritas")) map.removeSource("prioritas");
      return;
    }
    const { boundaries, levels } = priority;
    const data = {
      type: "FeatureCollection" as const,
      features: boundaries.features.map((f) => ({ ...f, properties: { ...f.properties, level: levels[f.properties.slug] ?? "" } })),
    } as Parameters<GeoJSONSource["setData"]>[0];
    const source = map.getSource("prioritas") as GeoJSONSource | undefined;
    if (source) return source.setData(data);
    const css = getComputedStyle(document.documentElement);
    const color = (name: string) => css.getPropertyValue(name).trim();
    const label = map.getStyle().layers?.find((layer) => layer.type === "symbol")?.id;
    map.addSource("prioritas", { type: "geojson", data });
    map.addLayer(
      {
        id: "prioritas-isi",
        type: "fill",
        source: "prioritas",
        paint: {
          "fill-color": ["match", ["get", "level"], ...LEVELS.flatMap((level) => [level, color(LEVEL_COLOR[level])]), "rgba(0,0,0,0)"] as never,
          "fill-opacity": 0.55,
        },
      },
      label,
    );
    map.addLayer({ id: "prioritas-garis", type: "line", source: "prioritas", paint: { "line-color": color("--color-text-primary"), "line-width": 1.5 } }, label);
  };
  map.on("style.load", drawPriority);

  let timer: number | undefined;
  const schedule = (delay: number) => {
    timer = window.setTimeout(renew, Math.max(delay, 1000));
  };
  const renew = async () => {
    try {
      token = await options.renewToken();
      mapboxgl.accessToken = token.token;
      schedule(Date.parse(token.expiresAt) - Date.now() - RENEW_BEFORE_MS);
    } catch {
      schedule(RETRY_MS);
    }
  };
  schedule(Date.parse(token.expiresAt) - Date.now() - RENEW_BEFORE_MS);

  const byId = new Map(places.map((place) => [place.id, place]));
  return {
    markers,
    zoomIn: () => map.zoomIn(),
    zoomOut: () => map.zoomOut(),
    reset: () => map.fitBounds(KOTA_BOGOR, { padding: 16 }),
    show(id) {
      const place = byId.get(id);
      if (place) map.easeTo({ center: [place.lng, place.lat], zoom: Math.max(map.getZoom(), 15) });
    },
    setSelected(id) {
      for (const [placeId, button] of markers) {
        button.setAttribute("aria-expanded", String(placeId === id));
        button.style.zIndex = placeId === id ? "1" : "";
      }
    },
    setNight(value) {
      if (value === night) return;
      night = value;
      map.setStyle(night ? STYLE.gelap : STYLE.terang);
    },
    setPriority(value) {
      priority = value;
      drawPriority();
    },
    destroy() {
      window.clearTimeout(timer);
      map.remove();
    },
  };
}
