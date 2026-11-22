import mapboxgl, { type GeoJSONSource, type LngLatBoundsLike } from "mapbox-gl";
import type { DistrictBoundaries, MapToken, PriorityLevel } from "@/lib/api";
import { LEVEL_COLOR, LEVELS } from "@/components/prioritas/levels";
import { motionReduced } from "@/lib/preferences";
import type { MapCandidate, MapPlace } from "../places";
import { NO_INSETS, cameraPadding, isVisible, visibleRect, type Insets, type Rect } from "./area";

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
  /** Tombol marker per id lokasi; isinya digambar komponen React lewat portal. Isinya berganti lewat setPlaces. */
  markers: Map<string, HTMLButtonElement>;
  zoomIn(): void;
  zoomOut(): void;
  reset(): void;
  show(id: string): void;
  /** Menggeser peta ke lokasi tanpa mengubah zoom, hanya bila lokasinya tidak terlihat atau di balik panel. */
  reveal(id: string): void;
  /**
   * Menandai posisi pengguna dengan titik (bukan tombol) dan menggeser peta ke sana. Posisi hanya dipakai di browser.
   * Mengembalikan false tanpa menggeser bila posisinya di luar wilayah yang bisa ditampilkan peta.
   */
  showUser(point: { lng: number; lat: number }): boolean;
  /** Mengganti lokasi di peta (mis. setelah filter berubah) tanpa membuat peta baru. */
  setPlaces(places: MapPlace[]): void;
  /**
   * Bagian peta yang tertutup panel (perpindahan peta menghindarinya) dan persegi elemen lain yang mengambang di atasnya.
   * Lokasi di balik keduanya tidak dihitung "di tampilan", dan markernya keluar dari urutan Tab. `camera` (bawaan:
   * `insets`) adalah bagian yang dihindari saat peta dipindah, mis. seluruh pita pencarian dan kontrol di atas.
   */
  setInsets(insets: Insets, covers?: Rect[], camera?: Insets): void;
  setSelected(id: string | null): void;
  setNight(night: boolean): void;
  /**
   * Kandidat "Belum ada data" (ADR-0049) sebagai satu lapisan GL di bawah marker, dengan atribusi OSM untuk kontrol
   * atribusi, atau null untuk menyembunyikannya. Kandidat tidak bisa difokus di peta; daftar di panel adalah gantinya.
   * Kandidat dipilih lewat `onSelect` dengan id-nya, dan `show`, `reveal`, serta `setSelected` menerima id itu juga.
   */
  setCandidates(candidates: { items: MapCandidate[]; attribution: string } | null): void;
  /** Lapisan prioritas kecamatan: batas dengan tingkatnya, atau null untuk menyembunyikannya. */
  setPriority(districts: { boundaries: DistrictBoundaries; levels: Record<string, PriorityLevel> } | null): void;
  destroy(): void;
};

type Options = {
  container: HTMLElement;
  token: MapToken;
  renewToken: () => Promise<MapToken>;
  places: MapPlace[];
  /** Bagian peta yang sudah tertutup panel saat peta dibuat, supaya tampilan awal Kota Bogor tidak di baliknya. */
  insets?: Insets;
  /** Bagian yang dihindari tampilan awal Kota Bogor; bawaan: `insets`. */
  camera?: Insets;
  night: boolean;
  /** Satu jari dan roda tetikus menggulir halaman, bukan peta, selama peta ada di tengah halaman. */
  cooperative?: boolean;
  locale: Record<string, string>;
  /** Id teks petunjuk keyboard untuk kanvas peta. */
  describedBy: string;
  markerLabel: (place: MapPlace) => string;
  onReady: () => void;
  onFail: () => void;
  /** Lokasi di bagian peta yang terlihat, atau null bila panel menutup seluruh peta (mis. lembar penuh di ponsel). */
  onView: (ids: string[] | null) => void;
  onSelect: (id: string) => void;
  /** Dipanggil dengan salinan marker setiap kali lokasi di peta berganti. */
  onMarkers: (markers: ReadonlyMap<string, HTMLButtonElement>) => void;
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
  let places = options.places;
  let insets = options.insets ?? NO_INSETS;
  let camera = options.camera ?? insets;
  let covers: Rect[] = [];
  let token = options.token;
  let night = options.night;
  let ready = false;
  mapboxgl.accessToken = token.token;

  const map = new mapboxgl.Map({
    container: options.container,
    style: night ? STYLE.gelap : STYLE.terang,
    bounds: KOTA_BOGOR,
    fitBoundsOptions: { padding: cameraPadding(options.container.clientWidth, options.container.clientHeight, [camera, insets]) },
    maxBounds: AREA,
    // Zoom 9 (dengan batas AREA) supaya seluruh kota muat di bagian peta yang sempit di atas lembar ponsel; di zoom 10
    // kota setinggi kira-kira 280 px.
    minZoom: 9,
    maxZoom: 18,
    dragRotate: false,
    pitchWithRotate: false,
    touchPitch: false,
    cooperativeGestures: options.cooperative ?? true,
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
  const pins = new Map<string, mapboxgl.Marker>();
  let user: mapboxgl.Marker | undefined;
  let byId = new Map<string, MapPlace>();
  const placeMarkers = (next: MapPlace[]) => {
    places = next;
    byId = new Map(places.map((place) => [place.id, place]));
    for (const [id, pin] of pins) {
      if (byId.has(id)) continue;
      pin.remove();
      pins.delete(id);
      markers.delete(id);
    }
    for (const place of places) {
      const pin = pins.get(place.id);
      if (pin) {
        pin.setLngLat([place.lng, place.lat]);
        markers.get(place.id)!.setAttribute("aria-label", options.markerLabel(place));
        continue;
      }
      const button = document.createElement("button");
      button.type = "button";
      // role ditulis eksplisit karena Mapbox memberi role="img" pada marker yang belum punya role.
      button.setAttribute("role", "button");
      button.setAttribute("aria-label", options.markerLabel(place));
      button.setAttribute("aria-expanded", "false");
      button.className = "grid size-11 cursor-pointer place-items-center rounded-full";
      button.addEventListener("click", () => options.onSelect(place.id));
      pins.set(place.id, new mapboxgl.Marker({ element: button }).setLngLat([place.lng, place.lat]).addTo(map));
      markers.set(place.id, button);
    }
    // Urutan Tab di antara marker mengikuti urutan lokasi (utara ke selatan), juga setelah marker baru ditambahkan.
    const order = places.map((place) => markers.get(place.id)!);
    const layer = map.getCanvasContainer();
    const current = [...layer.children].filter((element) => order.includes(element as HTMLButtonElement));
    if (order.some((element, index) => current[index] !== element)) for (const element of order) layer.appendChild(element);
    options.onMarkers(new Map(markers));
  };
  placeMarkers(places);

  // Marker di luar bagian peta yang terlihat (di luar layar, di balik panel, atau di bawah pencarian dan kontrol) keluar
  // dari urutan Tab dan disembunyikan dari pembaca layar, supaya fokus tidak pernah tertutup (WCAG 2.4.11); daftar ikut
  // bagian yang terlihat.
  const updateView = () => {
    const container = map.getContainer();
    const rect = visibleRect(container.clientWidth, container.clientHeight, insets);
    const ids: string[] = [];
    for (const place of places) {
      const inside = isVisible(map.project([place.lng, place.lat]), rect, covers);
      const button = markers.get(place.id)!;
      button.tabIndex = inside ? 0 : -1;
      if (inside) {
        button.removeAttribute("aria-hidden");
        ids.push(place.id);
      } else {
        button.setAttribute("aria-hidden", "true");
      }
    }
    options.onView(rect ? ids : null);
  };
  const padding = () => {
    const container = map.getContainer();
    return cameraPadding(container.clientWidth, container.clientHeight, [camera, insets]);
  };
  // Untuk memusatkan satu titik: tepat bagian yang terlihat, tanpa jarak tambahan. Di ponsel pendek bagian itu bisa lebih
  // sempit dari padding biasa, dan tanpa ini titiknya dipusatkan di seluruh kanvas, di balik panel.
  const focusPadding = () => {
    const container = map.getContainer();
    const rect = visibleRect(container.clientWidth, container.clientHeight, insets);
    return rect ? { top: rect.top, right: container.clientWidth - rect.right, bottom: container.clientHeight - rect.bottom, left: rect.left } : padding();
  };
  map.on("load", () => {
    ready = true;
    updateView();
    options.onReady();
  });
  map.on("moveend", updateView);
  map.on("resize", () => ready && updateView());
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

  // Kandidat: lingkaran abu-abu berlubang, lebih kecil dari marker dan tanpa warna status. Gaya baru menghapus lapisan,
  // jadi lapisan digambar ulang setiap kali gaya selesai dimuat; selama gaya belum siap, gambar menunggu peta diam.
  let candidates: Parameters<MapHandle["setCandidates"]>[0] = null;
  let candidateById = new Map<string, MapCandidate>();
  let selected: string | null = null;
  let waiting = false;
  const drawCandidates = () => {
    if (!map.isStyleLoaded()) {
      if (!waiting) {
        waiting = true;
        map.once("idle", () => {
          waiting = false;
          drawCandidates();
        });
      }
      return;
    }
    if (!candidates) {
      for (const id of ["kandidat-pilih", "kandidat"]) if (map.getLayer(id)) map.removeLayer(id);
      if (map.getSource("kandidat")) map.removeSource("kandidat");
      return;
    }
    const data = {
      type: "FeatureCollection" as const,
      features: candidates.items.map((c) => ({ type: "Feature" as const, geometry: { type: "Point" as const, coordinates: [c.lng, c.lat] }, properties: { id: c.id } })),
    };
    const source = map.getSource("kandidat") as GeoJSONSource | undefined;
    if (source) source.setData(data);
    else {
      const css = getComputedStyle(document.documentElement);
      const color = (name: string) => css.getPropertyValue(name).trim();
      map.addSource("kandidat", { type: "geojson", data, attribution: candidates.attribution });
      map.addLayer({
        id: "kandidat",
        type: "circle",
        source: "kandidat",
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 3.5, 15, 6],
          "circle-color": color("--color-bg-canvas"),
          "circle-stroke-color": color("--color-icon-secondary"),
          "circle-stroke-width": 2.5,
        },
      });
      map.addLayer({
        id: "kandidat-pilih",
        type: "circle",
        source: "kandidat",
        paint: { "circle-radius": 9, "circle-color": color("--color-bg-canvas"), "circle-stroke-color": color("--color-text-primary"), "circle-stroke-width": 4 },
      });
    }
    map.setFilter("kandidat-pilih", ["==", ["get", "id"], selected ?? ""]);
  };
  map.on("style.load", drawCandidates);

  // Lingkaran kandidat kecil, jadi sentuhan atau klik dalam 12 px dari titiknya ikut memilihnya (target 24 × 24 px);
  // yang terdekat menang.
  const candidateAt = (point: mapboxgl.Point) => {
    if (!candidates || !map.getLayer("kandidat")) return null;
    const hits = map.queryRenderedFeatures(
      [
        [point.x - 12, point.y - 12],
        [point.x + 12, point.y + 12],
      ],
      { layers: ["kandidat"] },
    );
    let nearest: string | null = null;
    let distance = Infinity;
    for (const hit of hits) {
      const candidate = candidateById.get(String((hit as { properties?: { id?: unknown } }).properties?.id));
      if (!candidate) continue;
      const { x, y } = map.project([candidate.lng, candidate.lat]);
      const d = Math.hypot(x - point.x, y - point.y);
      if (d < distance) [nearest, distance] = [candidate.id, d];
    }
    return nearest;
  };
  map.on("click", (event) => {
    // Klik pada marker lokasi (tombol HTML di atas kanvas) bukan klik kandidat.
    if (event.originalEvent.target instanceof Element && event.originalEvent.target.closest(".mapboxgl-marker")) return;
    const id = candidateAt(event.point);
    if (id) options.onSelect(id);
  });
  map.on("mousemove", (event) => {
    map.getCanvas().style.cursor = candidateAt(event.point) ? "pointer" : "";
  });

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

  return {
    markers,
    zoomIn: () => map.zoomIn(),
    zoomOut: () => map.zoomOut(),
    reset: () => map.fitBounds(KOTA_BOGOR, { padding: padding() }),
    show(id) {
      const place = byId.get(id) ?? candidateById.get(id);
      // Padding tidak disimpan sebagai padding peta, supaya perpindahan berikutnya tidak ikut bergeser.
      if (place) map.flyTo({ center: [place.lng, place.lat], zoom: Math.max(map.getZoom(), 15), padding: focusPadding(), retainPadding: false });
    },
    reveal(id) {
      const place = byId.get(id) ?? candidateById.get(id);
      if (!place) return;
      const container = map.getContainer();
      const rect = visibleRect(container.clientWidth, container.clientHeight, insets);
      const { x, y } = map.project([place.lng, place.lat]);
      // Titik yang sudah terlihat, tidak terlalu dekat ke tepi, tidak digeser.
      const margin = rect ? Math.min(56, (rect.bottom - rect.top) / 4, (rect.right - rect.left) / 4) : 0;
      if (rect && x >= rect.left + margin && x <= rect.right - margin && y >= rect.top + margin && y <= rect.bottom - margin) return;
      map.easeTo({ center: [place.lng, place.lat], padding: focusPadding(), retainPadding: false });
    },
    showUser({ lng, lat }) {
      const [[west, south], [east, north]] = AREA as [[number, number], [number, number]];
      if (lng < west || lng > east || lat < south || lat > north) return false;
      if (!user) {
        const dot = document.createElement("span");
        dot.className = "peta-saya";
        dot.setAttribute("aria-hidden", "true");
        user = new mapboxgl.Marker({ element: dot }).setLngLat([lng, lat]).addTo(map);
      } else {
        user.setLngLat([lng, lat]);
      }
      map.flyTo({ center: [lng, lat], zoom: Math.max(map.getZoom(), 15), padding: focusPadding(), retainPadding: false });
      return true;
    },
    setPlaces(next) {
      placeMarkers(next);
      if (ready) updateView();
    },
    setInsets(next, nextCovers = [], nextCamera = next) {
      camera = nextCamera;
      if (JSON.stringify([next, nextCovers]) === JSON.stringify([insets, covers])) return;
      insets = next;
      covers = nextCovers;
      if (ready) updateView();
    },
    setSelected(id) {
      for (const [placeId, button] of markers) {
        button.setAttribute("aria-expanded", String(placeId === id));
        button.style.zIndex = placeId === id ? "1" : "";
      }
      selected = id;
      if (map.getLayer("kandidat-pilih")) map.setFilter("kandidat-pilih", ["==", ["get", "id"], id ?? ""]);
    },
    setCandidates(value) {
      candidates = value;
      candidateById = new Map(value?.items.map((c) => [c.id, c]));
      drawCandidates();
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
