import mapboxgl, { type GeoJSONSource, type LngLatBoundsLike } from "mapbox-gl";
import { CATEGORIES, type Category, type CityOutline, type DistrictBoundaries, type MapToken } from "@/lib/api";
import { motionReduced } from "@/lib/preferences";
import { CATEGORY_VAR } from "@/ui/category-pin";
import { CATEGORY_ICON } from "@/ui/place-icons";
import type { MapCandidate, MapPlace } from "../places";
import { NO_INSETS, cameraPadding, isVisible, visibleRect, type Insets, type Rect } from "./area";
import { outsideCity } from "./city";

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
/** Lapisan batas kota, dari atas ke bawah. */
const BORDER_LAYERS = ["kota-garis", "kota-halo", "kota-luar"];
// Mulai zoom ini lingkaran kandidat memuat ikon kategorinya (ADR-0053); di bawahnya, tampilan seluruh kota, lingkarannya
// kecil tanpa ikon supaya ratusan titik tidak saling menutup. Mulai CANDIDATE_FULL_ZOOM lingkaran dan ikonnya penuh.
const CANDIDATE_ICON_ZOOM = 12;
const CANDIDATE_FULL_ZOOM = 14;
// Ikon kategori di dalam lingkaran kandidat: 14 px, digambar dua kali lebih rapat untuk layar tajam.
const CANDIDATE_ICON_PX = 14;
const CANDIDATE_ICON_RATIO = 2;
// Token baru diminta lima menit sebelum kedaluwarsa; bila gagal, dicoba lagi tiap menit.
const RENEW_BEFORE_MS = 5 * 60_000;
const RETRY_MS = 60_000;

export type Thematic = { name: string; boundaries: DistrictBoundaries; colors: Record<string, string | null> };

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
  /**
   * Batas Kota Bogor (ADR-0053): garis putus-putus di atas garis halo, dan area di luar kota sedikit dipudarkan, di bawah
   * label peta dasar, kandidat, dan marker. null menyembunyikannya. Selama garisnya tampil, kontainer peta mendapat
   * `data-batas-kota` berisi tema gaya yang menggambarnya ("terang" atau "gelap").
   */
  setBorder(outline: CityOutline | null): void;
  /**
   * Lapisan tematik (ADR-0053): isi setiap kecamatan dengan warnanya (nama variabel CSS, dibaca ulang setiap kali tema
   * berganti; null tanpa isi) dan garis kecamatan tipis, di bawah batas kota. null menyembunyikannya. Selama tampil,
   * kontainer peta mendapat `data-tematik` berisi `name`.
   */
  setThematic(value: Thematic | null): void;
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
  /**
   * Lokasi dan kandidat di bagian peta yang terlihat, atau null bila panel menutup seluruh peta (mis. lembar penuh di
   * ponsel).
   */
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

/** Ikon kategori (path Tabler 24 × 24, garis 1.75 seperti komponen Icon) sebagai gambar untuk lapisan simbol GL. */
function categoryIcon(category: Category, color: string): ImageData {
  const size = CANDIDATE_ICON_PX * CANDIDATE_ICON_RATIO;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const context = canvas.getContext("2d")!;
  context.scale(size / 24, size / 24);
  context.strokeStyle = color;
  context.lineWidth = 1.75;
  context.lineCap = "round";
  context.lineJoin = "round";
  for (const d of CATEGORY_ICON[category]) context.stroke(new Path2D(d));
  return context.getImageData(0, 0, size, size);
}

/** Peta Mapbox GL JS untuk halaman Peta (ADR-0016): marker HTML berupa tombol, tanpa rotasi dan kemiringan. */
export function mountMap(options: Options): MapHandle {
  let places = options.places;
  let insets = options.insets ?? NO_INSETS;
  let camera = options.camera ?? insets;
  let covers: Rect[] = [];
  let candidates: Parameters<MapHandle["setCandidates"]>[0] = null;
  let candidateById = new Map<string, MapCandidate>();
  let selected: string | null = null;
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
    // Kandidat di bagian yang terlihat ikut daftar "Belum ada data" di panel.
    for (const candidate of candidates?.items ?? []) if (isVisible(map.project([candidate.lng, candidate.lat]), rect, covers)) ids.push(candidate.id);
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

  // Lapisan tematik digambar di bawah batas kota (atau label peta dasar) dan di bawah marker (elemen HTML). Gaya baru
  // (tema berganti) menghapus semua lapisan, jadi lapisan digambar ulang dengan warna tema saat itu setiap kali gaya
  // selesai dimuat.
  let thematic: Thematic | null = null;
  const drawThematic = () => {
    if (!map.isStyleLoaded()) return;
    const container = map.getContainer();
    if (!thematic) {
      for (const id of ["tematik-garis", "tematik-isi"]) if (map.getLayer(id)) map.removeLayer(id);
      if (map.getSource("tematik")) map.removeSource("tematik");
      delete container.dataset.tematik;
      return;
    }
    const css = getComputedStyle(document.documentElement);
    const color = (name: string) => css.getPropertyValue(name).trim();
    const { boundaries, colors } = thematic;
    const data = {
      type: "FeatureCollection" as const,
      features: boundaries.features.map((f) => {
        const fill = colors[f.properties.slug];
        return { ...f, properties: { ...f.properties, warna: fill ? color(fill) : "rgba(0,0,0,0)" } };
      }),
    } as Parameters<GeoJSONSource["setData"]>[0];
    const source = map.getSource("tematik") as GeoJSONSource | undefined;
    if (source) source.setData(data);
    else {
      const below = map.getLayer("kota-luar") ? "kota-luar" : map.getStyle().layers?.find((layer) => layer.type === "symbol")?.id;
      map.addSource("tematik", { type: "geojson", data });
      map.addLayer({ id: "tematik-isi", type: "fill", source: "tematik", paint: { "fill-color": ["to-color", ["get", "warna"]], "fill-opacity": 0.55 } }, below);
      map.addLayer(
        { id: "tematik-garis", type: "line", source: "tematik", paint: { "line-color": color("--color-text-primary"), "line-width": 1, "line-opacity": 0.7 } },
        below,
      );
    }
    container.dataset.tematik = thematic.name;
  };
  map.on("style.load", drawThematic);

  // Batas kota digambar di bawah label peta dasar, tetapi di atas lapisan tematik: lapisan tematik disisipkan di bawah
  // "kota-luar" bila sudah ada. Seperti lapisan lain, semuanya digambar ulang setiap kali gaya (tema) berganti.
  let border: CityOutline | null = null;
  const drawBorder = () => {
    if (!map.isStyleLoaded()) return;
    const container = map.getContainer();
    if (!border) {
      for (const id of BORDER_LAYERS) if (map.getLayer(id)) map.removeLayer(id);
      if (map.getSource("kota")) map.removeSource("kota");
      delete container.dataset.batasKota;
      return;
    }
    const data = {
      type: "FeatureCollection" as const,
      features: [
        { type: "Feature" as const, properties: { bagian: "luar" }, geometry: outsideCity(border) },
        { type: "Feature" as const, properties: { bagian: "batas" }, geometry: border },
      ],
    } as Parameters<GeoJSONSource["setData"]>[0];
    const source = map.getSource("kota") as GeoJSONSource | undefined;
    if (source) source.setData(data);
    else {
      const css = getComputedStyle(document.documentElement);
      const color = (name: string) => css.getPropertyValue(name).trim();
      const label = map.getStyle().layers?.find((layer) => layer.type === "symbol")?.id;
      const width = (from: number, to: number) => ["interpolate", ["linear"], ["zoom"], 10, from, 15, to] as never;
      map.addSource("kota", { type: "geojson", data });
      map.addLayer({ id: "kota-luar", type: "fill", source: "kota", filter: ["==", ["get", "bagian"], "luar"], paint: { "fill-color": color("--color-bg-canvas"), "fill-opacity": 0.45 } }, label);
      map.addLayer(
        {
          id: "kota-halo",
          type: "line",
          source: "kota",
          filter: ["==", ["get", "bagian"], "batas"],
          layout: { "line-join": "round" },
          paint: { "line-color": color("--color-bg-canvas"), "line-width": width(5, 8), "line-opacity": 0.85 },
        },
        label,
      );
      map.addLayer(
        {
          id: "kota-garis",
          type: "line",
          source: "kota",
          filter: ["==", ["get", "bagian"], "batas"],
          paint: { "line-color": color("--color-text-primary"), "line-width": width(2.5, 4), "line-dasharray": [2, 1.5] },
        },
        label,
      );
    }
    // Nilainya tema gaya yang memuat garis ini, jadi terlihat bahwa garisnya digambar ulang setelah tema berganti.
    container.dataset.batasKota = night ? "gelap" : "terang";
  };
  map.on("style.load", drawBorder);

  // Kandidat: lingkaran berlubang bergaris warna kategori (issue #199), lebih kecil dari marker dan tanpa warna status.
  // Mulai CANDIDATE_ICON_ZOOM lingkarannya membesar dan memuat ikon kategori, supaya kategori tidak ditandai warna saja,
  // dan mulai CANDIDATE_FULL_ZOOM ukurannya penuh.
  // Gaya baru (juga saat tema berganti) menghapus lapisan dan gambar ikon, jadi keduanya digambar ulang setiap kali gaya
  // selesai dimuat, dengan warna tema saat itu; selama gaya belum siap, gambar menunggu peta diam.
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
      for (const id of ["kandidat-ikon", "kandidat-pilih", "kandidat"]) if (map.getLayer(id)) map.removeLayer(id);
      if (map.getSource("kandidat")) map.removeSource("kandidat");
      return;
    }
    const data = {
      type: "FeatureCollection" as const,
      features: candidates.items.map((c) => ({ type: "Feature" as const, geometry: { type: "Point" as const, coordinates: [c.lng, c.lat] }, properties: { id: c.id, category: c.category } })),
    };
    const source = map.getSource("kandidat") as GeoJSONSource | undefined;
    if (source) source.setData(data);
    else {
      const css = getComputedStyle(document.documentElement);
      const color = (name: string) => css.getPropertyValue(name).trim();
      for (const category of CATEGORIES) {
        const image = categoryIcon(category, color(CATEGORY_VAR[category]));
        if (map.hasImage(`kategori-${category}`)) map.updateImage(`kategori-${category}`, image);
        else map.addImage(`kategori-${category}`, image, { pixelRatio: CANDIDATE_ICON_RATIO });
      }
      map.addSource("kandidat", { type: "geojson", data, attribution: candidates.attribution });
      map.addLayer({
        id: "kandidat",
        type: "circle",
        source: "kandidat",
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 3.5, CANDIDATE_ICON_ZOOM - 0.01, 5, CANDIDATE_ICON_ZOOM, 8.5, CANDIDATE_FULL_ZOOM - 0.01, 9.5, CANDIDATE_FULL_ZOOM, 11],
          "circle-color": color("--color-bg-canvas"),
          "circle-stroke-color": ["match", ["get", "category"], ...CATEGORIES.flatMap((c) => [c, color(CATEGORY_VAR[c])]), color("--color-icon-secondary")] as never,
          "circle-stroke-width": ["step", ["zoom"], 2.5, CANDIDATE_FULL_ZOOM, 3],
        },
      });
      map.addLayer({
        id: "kandidat-pilih",
        type: "circle",
        source: "kandidat",
        paint: {
          "circle-radius": ["step", ["zoom"], 9, CANDIDATE_ICON_ZOOM, 12, CANDIDATE_FULL_ZOOM, 14],
          "circle-color": color("--color-bg-canvas"),
          "circle-stroke-color": color("--color-text-primary"),
          "circle-stroke-width": 4,
        },
      });
      map.addLayer({
        id: "kandidat-ikon",
        type: "symbol",
        source: "kandidat",
        minzoom: CANDIDATE_ICON_ZOOM,
        layout: {
          "icon-image": ["concat", "kategori-", ["get", "category"]],
          // 14 px penuh; di antara kedua zoom 10 px, pas di lingkaran yang lebih kecil.
          "icon-size": ["step", ["zoom"], 0.72, CANDIDATE_FULL_ZOOM, 1],
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
        },
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
      if (ready) updateView();
    },
    setNight(value) {
      if (value === night) return;
      night = value;
      // Tanpa diff: gaya selalu dimuat ulang penuh dan "style.load" selalu terpanggil, jadi semua lapisan sendiri digambar
      // ulang dengan warna tema baru. Dengan diff, lapisan sendiri bisa terhapus tanpa "style.load" bila kedua gaya
      // hanya berbeda di properti yang bisa di-diff.
      map.setStyle(night ? STYLE.gelap : STYLE.terang, { diff: false } as Parameters<typeof map.setStyle>[1]);
    },
    setBorder(value) {
      border = value;
      drawBorder();
    },
    setThematic(value) {
      thematic = value;
      drawThematic();
    },
    destroy() {
      window.clearTimeout(timer);
      map.remove();
    },
  };
}
