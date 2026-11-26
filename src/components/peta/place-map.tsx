"use client";

import "mapbox-gl/dist/mapbox-gl.css";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type MouseEvent, type Ref } from "react";
import { createPortal } from "react-dom";
import type { CandidateSource, DisabilityCounts, DistrictBoundaries, DistrictPriority, MapToken } from "@/lib/api";
import { hasWebGL, readTheme, watchPreferences } from "@/lib/preferences";
import { buttonClass } from "@/ui/button-styles";
import { Icon } from "@/ui/icon";
import { IconCurrentLocation, IconFocusCentered, IconList, IconMap2, IconMinus, IconPlus, type Glyph } from "@/ui/icons";
import { PlacePin } from "@/ui/place-pin";
import { CandidateList } from "./candidate-list";
import { CandidateSummary } from "./candidate-summary";
import { CategoryLegend, MapLegend } from "./legend";
import { LocatePanel, useLocate } from "./locate";
import { NO_INSETS, type Insets, type Rect } from "./map/area";
import type { MapHandle } from "./map/mount";
import { PlaceList } from "./place-list";
import { PlaceSheet, type SheetHeight } from "./place-sheet";
import { PlaceSummary } from "./place-summary";
import { PriorityKey } from "./priority-key";
import { PriorityLegend } from "./priority-legend";
import { ThematicChooser, type ThemeChoice } from "./thematic-chooser";
import { LEVEL_COLOR } from "@/components/prioritas/levels";
import { RAMP, classOf, classWidth, countsFor, type DisabilityFilter } from "./tematik/disabilitas";
import { DisabilityKey } from "./tematik/disability-key";
import { DisabilityTable } from "./tematik/disability-table";
import type { MapCandidate, MapPlace } from "./places";

type MapState = "awal" | "memuat" | "siap" | "tanpa-webgl" | "galat";

async function fetchToken(): Promise<MapToken> {
  const response = await fetch("/peta/kunci", { cache: "no-store" });
  if (!response.ok) throw new Error("token peta tidak tersedia");
  return (await response.json()) as MapToken;
}

/** Elemen yang mengambang di atas peta. Marker di bawahnya tidak terlihat, jadi tidak boleh bisa difokus (WCAG 2.4.11). */
const OVERLAYS = ".peta-cari, .peta-lapisan, .peta-kontrol, .peta-kunci, .peta-pilihan, .peta-lokasi";
/** Tinggi satu baris kunci prioritas yang ringkas (tombol 44 px dan bingkainya). */
const KEY_LINE = 56;

/**
 * Bagian atas main yang terpakai pencarian dan kontrol (batas tinggi panel setengah), bagian peta yang tertutup panel
 * daftar, persegi setiap elemen yang mengambang di atas peta, dan tinggi terbesar kunci prioritas supaya tidak masuk ke
 * balik panel atau Bottom nav. Panel samping (mulai 768 px) menutup sisi kiri, lembar bawah menutup bagian bawah dan
 * pencarian bagian atas. Bottom nav di layar lebar menutup bagian bawah, selebar padding bawah main.
 */
function measure(main: HTMLElement): { top: number; insets: Insets; covers: Rect[]; camera: Insets; keyRoom: number | null; keyHidden: boolean } {
  const box = main.getBoundingClientRect();
  const rectOf = (element: Element): Rect => {
    const rect = element.getBoundingClientRect();
    return { left: rect.left - box.left, top: rect.top - box.top, right: rect.right - box.left, bottom: rect.bottom - box.top };
  };
  const below = (selector: string) => {
    const element = main.querySelector(selector);
    return element ? rectOf(element).bottom : 0;
  };
  // Kunci prioritas tidak ikut dihitung: tingginya sendiri dibatasi oleh panel (keyRoom).
  const top = Math.ceil(Math.max(below(".peta-cari"), below(".peta-kontrol"), below(".peta-lapisan")));
  const panel = main.querySelector(".peta-lembar")?.getBoundingClientRect();
  const paddingBottom = Number.parseFloat(getComputedStyle(main).paddingBottom) || 0;
  const side = !!panel && panel.width < box.width * 0.75;
  const key = main.querySelector(".peta-kunci")?.getBoundingClientRect();
  // Kunci berhenti 8 px di atas lembar bawah, atau di atas padding bawah main (Bottom nav) di layar lebar. Bila satu
  // baris kunci pun tidak muat (lembar setengah di ponsel pendek), kunci disembunyikan, supaya tidak ada tombol atau
  // tautan yang terpotong tetapi masih bisa difokus.
  // Atribusi peta di atas lembar bawah juga tidak boleh tertutup kunci, supaya tautannya tetap bisa diketuk.
  const attribution = main.querySelector(".mapboxgl-ctrl-attrib")?.getBoundingClientRect();
  const floor = Math.min(side || !panel ? box.bottom - paddingBottom : panel.top, attribution && !side && attribution.top > (key?.top ?? 0) ? attribution.top : Infinity);
  const keyRoom = key ? Math.max(0, Math.floor(floor - key.top - 8)) : null;
  const keyHidden = keyRoom !== null && keyRoom < KEY_LINE;
  const covers = [...main.querySelectorAll(OVERLAYS)]
    .filter((element) => !(keyHidden && element.matches(".peta-kunci")))
    .map(rectOf)
    .filter((rect) => rect.right > rect.left && rect.bottom > rect.top);
  if (!panel) return { top, insets: NO_INSETS, covers, camera: NO_INSETS, keyRoom, keyHidden };
  const insets = side
    ? { top: 0, right: 0, bottom: paddingBottom, left: panel.right - box.left }
    : // Atribusi Mapbox duduk di atas lembar, jadi ikut dihitung sebagai bagian yang tertutup. Kunci prioritas
      // mengambang selebar layar di ponsel, di bawah tombol lapisannya.
      { top: Math.max(below(".peta-cari"), keyHidden ? 0 : below(".peta-kunci")), right: 0, bottom: box.bottom - panel.top + 44, left: 0 };
  // Perpindahan peta di ponsel menghindari seluruh pita atas, juga celah di antara tombol lapisan dan kontrol.
  return { top, insets, covers, camera: side ? insets : { ...insets, top: Math.max(insets.top, top) }, keyRoom, keyHidden };
}

/** Elemen bisa menerima fokus: tidak di bagian yang inert dan tidak dikeluarkan dari urutan Tab (marker yang tertutup). */
const canFocus = (element: HTMLElement | null | undefined): element is HTMLElement =>
  !!element && element.isConnected && !element.closest("[inert]") && element.tabIndex >= 0 && element.getAttribute("aria-hidden") !== "true";

const NARROW = "(width < 48rem)";
const subscribeNarrow = (onChange: () => void) => {
  const query = matchMedia(NARROW);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};

// Ponsel landscape: panel yang dibuka langsung setinggi layar (globals.css), karena setengah layar hanya menyisakan
// beberapa piksel isi.
const SHORT = "(height < 32rem)";
/** Teks untuk atribusi peta (HTML Mapbox). */
const escapeHtml = (text: string) => text.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const subscribeShort = (onChange: () => void) => {
  const query = matchMedia(SHORT);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};

/**
 * Peta Kota Bogor layar penuh (FR-05, ADR-0016) dengan marker per status, kontrol zoom, dan panel daftar yang berisi
 * ringkasan lokasi yang dipilih, legenda, dan daftar lokasi di bagian peta yang terlihat sebagai alternatif untuk
 * pembaca layar. Semua bagiannya item grid `main.peta-app`. Mapbox GL JS dimuat sekali, hanya bila WebGL ada; tanpa
 * JavaScript, WebGL, atau token, daftar tetap berisi semua lokasi.
 */
export function PlaceMap({
  places,
  listHref,
  filtered,
  priority = null,
  candidates = [],
  candidateSource = null,
}: {
  places: MapPlace[];
  listHref: string;
  /** Ada pencarian atau filter, untuk pesan saat tidak ada lokasi. */
  filtered: boolean;
  /** Prioritas kecamatan; null selama API belum membukanya, dan tombol lapisannya tidak tampil. */
  priority?: DistrictPriority | null;
  /** Kandidat "Belum ada data" dari OpenStreetMap (ADR-0049); kosong selama filter status atau fasilitas aktif. */
  candidates?: MapCandidate[];
  candidateSource?: CandidateSource | null;
}) {
  const t = useTranslations("Peta");
  const tj = useTranslations("Jelajahi");
  const tk = useTranslations("Kategori");
  const ts = useTranslations("Status");
  const frame = useRef<HTMLDivElement>(null);
  const container = useRef<HTMLDivElement>(null);
  const listHeading = useRef<HTMLHeadingElement>(null);
  const summaryHeading = useRef<HTMLHeadingElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  // Perpindahan peta ke lokasi yang dipilih menunggu panel selesai berganti tinggi, supaya lokasinya tidak jatuh di balik
  // panel: "show" memperbesar (dari daftar), "reveal" hanya menggeser bila perlu (dari marker).
  const pendingMove = useRef<{ id: string; mode: "show" | "reveal" } | null>(null);
  const moveTimer = useRef<number | undefined>(undefined);
  const mapRef = useRef<MapHandle | null>(null);
  const [map, setMap] = useState<MapHandle | null>(null);
  // Salinan marker dari peta, diperbarui setiap kali lokasinya berganti, supaya portal isi marker ikut digambar ulang.
  const [markers, setMarkers] = useState<ReadonlyMap<string, HTMLButtonElement>>(new Map());
  const [state, setState] = useState<MapState>("awal");
  const [attempt, setAttempt] = useState(0);
  const [inView, setInView] = useState<Set<string> | null>(null);
  const [chosen, setSelected] = useState<{ id: string; from: "peta" | "daftar" } | null>(null);
  // Tinggi panel yang dipilih pengguna. Sebelum itu ("awal") lembar ponsel kecil dan panel samping terbuka, langsung dari
  // CSS, jadi tidak ada lompatan saat halaman selesai dimuat.
  const [chosenHeight, setHeight] = useState<SheetHeight | null>(null);
  const narrow = useSyncExternalStore(subscribeNarrow, () => matchMedia(NARROW).matches, () => true);
  const short = useSyncExternalStore(subscribeShort, () => matchMedia(SHORT).matches, () => false);
  const height: SheetHeight = chosenHeight ?? (narrow ? "kecil" : "setengah");
  // Peta tematik (ADR-0053): satu lapisan sekaligus. "galat" berarti batas kecamatan gagal dimuat (tabel tetap ada),
  // "tanpa-data" berarti data lapisan itu sendiri gagal dimuat.
  const [theme, setTheme] = useState<ThemeChoice>("tidak");
  const [themeState, setThemeState] = useState<"memuat" | "siap" | "galat" | "tanpa-data">("siap");
  const [disability, setDisability] = useState<DisabilityCounts | null>(null);
  const disabilityRequest = useRef<Promise<DisabilityCounts> | null>(null);
  // Jenis dan tahun lapisan Persebaran disabilitas; tanpa tahun berarti tahun terbaru.
  const [disabilityChoice, setDisabilityChoice] = useState<{ category: DisabilityFilter["category"]; year: number | null }>({ category: "semua", year: null });
  const [chooserOpen, setChooserOpen] = useState(false);
  // Pesan "disembunyikan" hanya setelah pengguna sendiri memilih Tidak ada.
  const [themeTouched, setThemeTouched] = useState(false);
  // Pilihan terakhir yang menunggu datanya, supaya jawaban lama tidak menimpa pilihan yang lebih baru.
  const themeRequest = useRef(0);
  const [boundaries, setBoundaries] = useState<DistrictBoundaries | null>(null);
  // Batas kecamatan dimuat sekali untuk batas kota dan lapisan prioritas; permintaan yang gagal boleh diulang.
  const boundariesRequest = useRef<Promise<DistrictBoundaries> | null>(null);
  const locateButton = useRef<HTMLButtonElement>(null);
  const locate = useLocate(map);
  // Lapisan kandidat menyala selama ada kandidat; tombolnya di legenda.
  const [candidatesOn, setCandidatesOn] = useState(true);
  const layerCandidates = candidatesOn && candidates.length > 0 ? candidates : null;
  // Lokasi atau kandidat yang dipilih lalu hilang karena filter berganti (atau lapisannya dimatikan) tidak lagi dianggap
  // terpilih.
  const place = chosen ? places.find((p) => p.id === chosen.id) : undefined;
  const candidate = chosen && !place ? layerCandidates?.find((c) => c.id === chosen.id) : undefined;
  const selected = place?.id ?? candidate?.id ?? null;
  const osmCredit = candidateSource?.attribution ?? t("kandidat.attribution");
  const osmCopyright = candidateSource?.url ?? "https://www.openstreetmap.org/copyright";

  const flushMove = useCallback(() => {
    const move = pendingMove.current;
    pendingMove.current = null;
    window.clearTimeout(moveTimer.current);
    if (move) mapRef.current?.[move.mode](move.id);
  }, []);

  // Bila tinggi panel tidak berubah, pengukuran tidak terjadi; perpindahan tetap dijalankan setelah jeda singkat.
  const queueMove = useCallback(
    (id: string, mode: "show" | "reveal") => {
      pendingMove.current = { id, mode };
      window.clearTimeout(moveTimer.current);
      moveTimer.current = window.setTimeout(flushMove, 500);
    },
    [flushMove],
  );

  useEffect(() => {
    let cancelled = false;
    let mounted: MapHandle | undefined;
    (async () => {
      // Tanpa peta, daftar dibuka supaya langsung terlihat.
      if (!hasWebGL()) {
        setHeight("setengah");
        return setState("tanpa-webgl");
      }
      setState("memuat");
      try {
        const [{ mountMap }, token] = await Promise.all([import("./map/mount"), fetchToken()]);
        const main = container.current?.closest("main");
        if (cancelled || !container.current || !main) return;
        const area = measure(main);
        mounted = mountMap({
          container: container.current,
          // Tampilan awal Kota Bogor di bagian peta yang tidak tertutup panel.
          insets: area.insets,
          camera: area.camera,
          token,
          renewToken: fetchToken,
          // Lokasi dikirim lewat setPlaces di bawah, juga setiap kali filter berubah, tanpa membuat peta baru.
          places: [],
          night: readTheme().night,
          // Peta memenuhi layar dan halaman tidak digulir, jadi satu jari dan roda tetikus langsung menggerakkan peta.
          cooperative: false,
          locale: {
            "Map.Title": t("map.title"),
            "AttributionControl.ToggleAttribution": t("map.attribution"),
            "LogoControl.Title": t("map.logo"),
            "ScrollZoomBlocker.CtrlMessage": t("map.ctrlScroll"),
            "ScrollZoomBlocker.CmdMessage": t("map.cmdScroll"),
            "TouchPanBlocker.Message": t("map.twoFingers"),
          },
          describedBy: "petunjuk-peta",
          markerLabel: (p) => t("marker", { name: p.name, category: tk(p.category), status: ts(p.status) }),
          onReady: () => setState("siap"),
          onFail: () => {
            setState("galat");
            setHeight("setengah");
          },
          onView: (ids) => setInView(ids && new Set(ids)),
          onSelect: (id) => {
            setSelected({ id, from: "peta" });
            setHeight("setengah");
            queueMove(id, "reveal");
          },
          onMarkers: setMarkers,
        });
        mapRef.current = mounted;
        setMap(mounted);
      } catch {
        if (!cancelled) {
          setState("galat");
          setHeight("setengah");
        }
      }
    })();
    const unwatch = watchPreferences(() => mounted?.setNight(readTheme().night));
    return () => {
      cancelled = true;
      unwatch();
      mounted?.destroy();
      mapRef.current = null;
      setMap(null);
    };
  }, [attempt, t, tk, ts, queueMove]);

  useEffect(() => {
    map?.setPlaces(places);
  }, [map, places]);

  // Atribusi ODbL ikut di kontrol atribusi peta selama lapisan kandidat tampil. Mapbox membuang `target` dari tautan
  // atribusi, jadi tautannya terbuka di tab yang sama, seperti tautan atribusi Mapbox lainnya.
  useEffect(() => {
    const attribution = `<a href="${escapeHtml(osmCopyright)}">${escapeHtml(osmCredit)}</a>`;
    map?.setCandidates(layerCandidates && { items: layerCandidates, attribution });
  }, [map, layerCandidates, osmCredit, osmCopyright]);

  // Tinggi panel ditulis di main, karena panel, atribusi Mapbox, dan pesan di atas peta memakai ukuran yang sama.
  useLayoutEffect(() => {
    const main = frame.current?.closest("main");
    if (main) main.dataset.tinggi = chosenHeight ?? "awal";
  }, [chosenHeight]);

  // Lembar penuh di ponsel (juga lembar yang dibuka di ponsel landscape) menutup pencarian, kontrol, dan peta: bagian itu
  // dibuat inert supaya fokus tidak masuk ke sesuatu yang tidak terlihat (WCAG 2.4.11).
  useLayoutEffect(() => {
    const main = frame.current?.closest("main");
    const covered = narrow && (height === "penuh" || (height === "setengah" && short));
    for (const element of main?.querySelectorAll<HTMLElement>(".peta-cari, .peta-lapisan, .peta-kontrol, .peta-peta") ?? []) element.inert = covered;
  }, [height, narrow, short, state, priority]);

  // Ukuran diukur ulang setelah berhenti berubah (mis. selesai animasi panel), lalu perpindahan yang menunggu dijalankan.
  useEffect(() => {
    const main = frame.current?.closest("main");
    if (!main) return;
    let timer: number | undefined;
    const update = () => {
      const { top, insets, covers, camera, keyRoom, keyHidden } = measure(main);
      main.style.setProperty("--peta-atas", `${top}px`);
      if (keyRoom === null) main.style.removeProperty("--peta-kunci-maks");
      else main.style.setProperty("--peta-kunci-maks", `${keyRoom}px`);
      main.toggleAttribute("data-kunci-tersembunyi", keyHidden);
      map?.setInsets(insets, covers, camera);
      flushMove();
    };
    const schedule = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(update, 120);
    };
    const observer = new ResizeObserver(schedule);
    for (const selector of [".peta-lembar", ".peta-cari", ".peta-kontrol", ".peta-lapisan", ".peta-kunci", ".peta-pilihan", ".peta-lokasi"]) {
      const element = main.querySelector(selector);
      if (element) observer.observe(element);
    }
    observer.observe(main);
    update();
    return () => {
      observer.disconnect();
      window.clearTimeout(timer);
    };
    // Kunci prioritas dan kartu Lokasi saya muncul dan hilang, jadi pengamatnya dipasang ulang.
  }, [map, state, priority, theme, themeState, chooserOpen, locate.phase, flushMove]);

  // Ringkasan menerima fokus setiap kali lokasi dipilih, supaya pembaca layar langsung membacanya.
  useEffect(() => {
    map?.setSelected(selected);
    if (selected) summaryHeading.current?.focus();
  }, [map, selected]);

  // Escape menutup ringkasan selama fokus ada di peta, lalu fokus kembali ke marker lokasi itu.
  useEffect(() => {
    const element = frame.current;
    if (!chosen || !element) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setSelected(null);
      if (chosen.from === "peta") map?.markers.get(chosen.id)?.focus();
    };
    element.addEventListener("keydown", onKey);
    return () => element.removeEventListener("keydown", onKey);
  }, [map, chosen]);

  // Persebaran disabilitas: jumlah untuk jenis dan tahun yang dipilih, dengan kelas warnanya.
  const disabilityFilter: DisabilityFilter | null = disability && { category: disabilityChoice.category, year: disabilityChoice.year ?? disability.years.at(-1)! };
  const disabilityCounts = disability && disabilityFilter ? countsFor(disability, disabilityFilter) : [];
  const disabilityMax = Math.max(0, ...disabilityCounts.map((d) => d.count));
  const disabilityWidth = classWidth(disabilityMax);

  // Lapisan tematik mengikuti peta: digambar ulang bila peta dibuat ulang (mis. setelah Coba lagi).
  const thematicColors =
    themeState !== "siap"
      ? null
      : theme === "prioritas" && priority
        ? Object.fromEntries(priority.districts.map((d) => [d.slug, LEVEL_COLOR[d.level]]))
        : theme === "disabilitas" && disability
          ? Object.fromEntries(disabilityCounts.map((d) => [d.slug, RAMP[classOf(d.count, disabilityWidth)]!]))
          : null;
  const thematicKey = JSON.stringify(thematicColors);
  useEffect(() => {
    if (!map) return;
    const colors = JSON.parse(thematicKey) as Record<string, string> | null;
    map.setThematic(colors && boundaries ? { name: theme, boundaries, colors } : null);
  }, [map, theme, thematicKey, boundaries]);

  const ready = state === "siap";
  const loadBoundaries = useCallback(() => {
    boundariesRequest.current ??= (async () => {
      const response = await fetch("/peta/batas-kecamatan");
      if (!response.ok) throw new Error("batas kecamatan tidak tersedia");
      const value = (await response.json()) as DistrictBoundaries;
      setBoundaries(value);
      return value;
    })().catch((error: unknown) => {
      boundariesRequest.current = null;
      throw error;
    });
    return boundariesRequest.current;
  }, []);

  // Batas Kota Bogor selalu tampil setelah peta siap (ADR-0053). Bila batasnya gagal dimuat, peta tetap tanpa garis itu.
  useEffect(() => {
    if (ready) loadBoundaries().catch(() => {});
  }, [ready, loadBoundaries]);

  useEffect(() => {
    map?.setBorder(boundaries?.outline ?? null);
  }, [map, boundaries]);

  const loadDisability = useCallback(() => {
    disabilityRequest.current ??= (async () => {
      const response = await fetch("/peta/data-disabilitas");
      if (!response.ok) throw new Error("data disabilitas tidak tersedia");
      const value = (await response.json()) as DisabilityCounts;
      setDisability(value);
      return value;
    })().catch((error: unknown) => {
      disabilityRequest.current = null;
      throw error;
    });
    return disabilityRequest.current;
  }, []);

  /** Memilih lapisan tematik, lalu memuat batas kecamatan dan data lapisannya bila belum ada. */
  async function chooseTheme(value: ThemeChoice) {
    const request = ++themeRequest.current;
    setTheme(value);
    if (value === "tidak") return setThemeState("siap");
    setThemeState("memuat");
    const ok = (promise: Promise<unknown>) => promise.then(
      () => true,
      () => false,
    );
    const [bounds, data] = await Promise.all([ok(loadBoundaries()), value === "disabilitas" ? ok(loadDisability()) : true]);
    if (request === themeRequest.current) setThemeState(!data ? "tanpa-data" : bounds ? "siap" : "galat");
  }

  // Daftar mengikuti bagian peta yang terlihat. Sebelum peta siap, tanpa peta, atau saat panel menutup seluruh peta (lembar
  // penuh), daftar berisi semua lokasi.
  const followsView = ready && inView !== null;
  const shown = followsView ? places.filter((p) => inView.has(p.id)) : places;
  const shownCandidates = layerCandidates && (followsView ? layerCandidates.filter((c) => inView.has(c.id)) : layerCandidates);
  // Tanpa lokasi sama sekali, kepala panel (yang selalu terlihat) membawa pesannya: belum ada data, atau filter terlalu
  // sempit.
  const empty = tj(filtered ? "results.emptyTitle" : "results.noDataTitle");
  const status = places.length === 0 ? empty : followsView ? t("list.count", { shown: shown.length, total: places.length }) : t("count", { total: places.length });
  // Pilihan yang ada: Prioritas pemetaan hanya selama API membuka data disabilitas.
  const themeOptions: ThemeChoice[] = priority ? ["tidak", "prioritas", "disabilitas"] : [];
  const themeName = theme === "tidak" ? "" : t(`tematik.pilihan.${theme}.label`);
  // Kunci dan tabel tampil setelah datanya dimuat, juga bila batas kecamatan gagal (lapisan tanpa warna, tabel tetap ada).
  const themeShown = themeState !== "memuat" ? theme : "tidak";

  /**
   * Menutup ringkasan, lalu fokus kembali ke marker atau ke tombol daftar yang membukanya. Bila marker itu tidak bisa
   * difokus lagi (mis. lembar di ponsel landscape menutup peta dan membuatnya inert), fokus pindah ke tombol daftar lokasi
   * itu, atau ke judul daftar.
   */
  function closeSummary() {
    if (!chosen) return;
    const { id, from } = chosen;
    setSelected(null);
    requestAnimationFrame(() => {
      const marker = map?.markers.get(id);
      if (from === "peta" && canFocus(marker)) return marker.focus();
      const show = document.querySelector<HTMLButtonElement>(`[data-tunjukkan="${id}"]`);
      if (canFocus(show)) return show.focus();
      listHeading.current?.focus();
    });
  }

  function showOnMap(id: string) {
    setSelected({ id, from: "daftar" });
    setHeight("setengah");
    queueMove(id, "show");
  }

  /** Membuka panel daftar di tabel atau daftar lapisan tematik, lalu memindahkan fokus ke sana. */
  function showTable(id: string) {
    setSelected(null);
    setHeight(narrow ? "penuh" : "setengah");
    requestAnimationFrame(() => requestAnimationFrame(() => document.getElementById(id)?.focus()));
  }

  function skipToList(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    if (height === "kecil") setHeight("setengah");
    listHeading.current?.focus();
  }

  return (
    <>
      {themeOptions.length > 1 && (
        <div className="peta-lapisan">
          <ThematicChooser
            options={themeOptions}
            value={theme}
            onChange={(value) => {
              setThemeTouched(true);
              void chooseTheme(value);
            }}
            open={chooserOpen}
            onOpen={setChooserOpen}
          />
          <p role="status" className="sr-only">
            {themeState === "memuat"
              ? t("tematik.loading", { name: themeName })
              : theme !== "tidak"
                ? // Galat diumumkan lewat role="alert" di kuncinya.
                  themeState === "siap"
                  ? t("tematik.on", { name: themeName })
                  : ""
                : themeTouched
                  ? t("tematik.off")
                  : ""}
          </p>
          {themeShown === "disabilitas" && themeState === "tanpa-data" && (
            <p role="alert" className="peta-kunci panel-raised rounded-2xl p-4 text-sm">
              {t("disabilitas.failed")}
            </p>
          )}
          {themeShown === "disabilitas" && disability && disabilityFilter && themeState !== "tanpa-data" && (
            <DisabilityKey
              data={disability}
              filter={disabilityFilter}
              onFilter={(next) => setDisabilityChoice(next)}
              width={disabilityWidth}
              max={disabilityMax}
              boundariesFailed={themeState === "galat"}
              attribution={boundaries?.attribution ?? null}
              compact={narrow}
              onShowTable={() => showTable("tabel-disabilitas")}
            />
          )}
          {themeShown === "prioritas" && priority && (
            <PriorityKey
              priority={priority}
              failed={themeState === "galat"}
              attribution={boundaries?.attribution ?? null}
              compact={narrow}
              onShowTable={() => showTable("tabel-prioritas")}
            />
          )}
        </div>
      )}
      <a
        href="#judul-daftar-peta"
        onClick={skipToList}
        className="sr-only z-30 focus:not-sr-only focus:absolute focus:top-3 focus:left-1/2 focus:inline-flex focus:min-h-11 focus:-translate-x-1/2 focus:items-center focus:rounded-full focus:bg-surface-inverse focus:px-4 focus:text-text-on-inverse"
      >
        {t("map.skip")}
      </a>
      {ready && (
        <div className="peta-kontrol">
          <div role="group" aria-label={t("controls.label")} className="panel-raised flex overflow-hidden rounded-2xl md:flex-col">
            <ControlButton label={t("controls.zoomIn")} icon={IconPlus} onClick={() => map?.zoomIn()} />
            <ControlButton label={t("controls.zoomOut")} icon={IconMinus} onClick={() => map?.zoomOut()} />
            <ControlButton label={t("controls.reset")} icon={IconFocusCentered} onClick={() => map?.reset()} />
            <ControlButton ref={locateButton} label={t("lokasiSaya.button")} icon={IconCurrentLocation} onClick={locate.start} />
          </div>
          <LocatePanel locate={locate} buttonRef={locateButton} />
        </div>
      )}
      <div ref={frame} className="peta-peta">
        {/* Mapbox memberi kontainer peta position: relative, jadi ukurannya diambil dari bingkai lewat size-full. */}
        <div ref={container} className="size-full" />
        {ready && (
          <p id="petunjuk-peta" className="peta-petunjuk">
            {t("map.hint")}
          </p>
        )}
        <div className="peta-pesan">
          {state === "memuat" && (
            <p role="status" className="panel-raised rounded-full px-5 py-3 font-semibold">
              {t("map.loading")}
            </p>
          )}
        </div>
        <noscript>
          {/* Tanpa JavaScript panel daftar tidak bisa dibuka, jadi dibuka penuh dari awal. */}
          <style>{".peta-app{--peta-bawah:100%!important}.peta-lembar{align-self:stretch!important}.peta-lembar-isi{visibility:visible!important;display:block!important}"}</style>
        </noscript>
      </div>
      <PlaceSheet
        height={height}
        onHeight={setHeight}
        onEscape={() => {
          if (chosen) return closeSummary();
          if (height === "kecil") return;
          setHeight("kecil");
          toggle.current?.focus();
        }}
        title={t(followsView && places.length > 0 ? "list.inView" : "list.title")}
        status={status}
        headingRef={listHeading}
        toggleRef={toggle}
      >
        {place ? (
          <PlaceSummary place={place} headingRef={summaryHeading} onClose={closeSummary} />
        ) : candidate ? (
          <CandidateSummary candidate={candidate} headingRef={summaryHeading} onClose={closeSummary} />
        ) : (
          <div className="flex flex-col gap-5 px-5 pb-5">
            {/* Pesan peta yang gagal ada di panel, bukan di atas peta, supaya tidak pernah tertutup panel di layar pendek. */}
            {(state === "tanpa-webgl" || state === "galat") && (
              <div role="alert" className="flex flex-col items-start gap-3 rounded-2xl bg-surface-brand-subtle p-4">
                <p className="inline-flex items-center gap-2 font-heading text-lg font-bold">
                  <Icon icon={IconMap2} className="size-5 text-icon-brand" />
                  {t(state === "galat" ? "map.failedTitle" : "map.noWebglTitle")}
                </p>
                <p>{t("map.fallbackBody")}</p>
                <div className="flex flex-wrap gap-3">
                  {state === "galat" && (
                    <button type="button" onClick={() => setAttempt(attempt + 1)} className={buttonClass("outline", "sm")}>
                      {t("map.retry")}
                    </button>
                  )}
                  <Link href={listHref} className={buttonClass("outline", "sm")}>
                    <Icon icon={IconList} />
                    {t("asList")}
                  </Link>
                </div>
              </div>
            )}
            {/* Tanpa lokasi, penjelasannya di bagian paling atas panel. */}
            {places.length === 0 && (
              <div className="flex flex-col items-start gap-2 rounded-2xl bg-bg-sunken p-4">
                <p className="font-bold">{empty}</p>
                <p className="text-text-secondary">{filtered ? tj("results.emptyBody") : layerCandidates ? t("kandidat.emptyBody") : tj("results.noDataBody")}</p>
                {filtered && (
                  <Link href="/peta" className={buttonClass("outline", "sm", "mt-1")}>
                    {tj("filters.reset")}
                  </Link>
                )}
              </div>
            )}
            <noscript>
              <p className="rounded-2xl bg-surface-brand-subtle p-4 font-semibold">{t("map.noscript")}</p>
            </noscript>
            <Link href={listHref} className={buttonClass("outline", "sm", "self-start")}>
              <Icon icon={IconList} />
              {t("asList")}
            </Link>
            <MapLegend
              candidates={candidates.length > 0 ? { on: candidatesOn, onToggle: () => setCandidatesOn(!candidatesOn) } : undefined}
              border={ready && !!boundaries?.outline}
            />
            <CategoryLegend />
            {places.length > 0 &&
              (shown.length > 0 ? (
                <PlaceList places={shown} labelledBy="judul-daftar-peta" onShow={ready ? showOnMap : undefined} />
              ) : (
                <p className="rounded-2xl bg-bg-sunken p-4 text-text-secondary">{t("list.none")}</p>
              ))}
            {shownCandidates && <CandidateList candidates={shownCandidates} onShow={ready ? showOnMap : undefined} />}
            {themeShown === "prioritas" && priority && <PriorityLegend priority={priority} attribution={boundaries?.attribution ?? null} />}
            {themeShown === "disabilitas" && disability && disabilityFilter && themeState !== "tanpa-data" && (
              <DisabilityTable data={disability} filter={disabilityFilter} width={disabilityWidth} max={disabilityMax} attribution={boundaries?.attribution ?? null} />
            )}
          </div>
        )}
      </PlaceSheet>
      {map &&
        places.map((p) => {
          const element = markers.get(p.id);
          return element ? createPortal(<MarkerFace place={p} selected={p.id === selected} />, element, p.id) : null;
        })}
    </>
  );
}

function ControlButton({ label, icon, onClick, ref }: { label: string; icon: Glyph; onClick: () => void; ref?: Ref<HTMLButtonElement> }) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      onClick={onClick}
      className="grid size-11 place-items-center text-text-primary not-last:border-r not-last:border-border-subtle hover:bg-surface-hover md:not-last:border-r-0 md:not-last:border-b"
    >
      <Icon icon={icon} />
    </button>
  );
}

/** Isi tombol marker: bentuk dari legenda, dan nama tempat di bawahnya saat dipilih. Nama aksesibel ada di tombolnya. */
function MarkerFace({ place, selected }: { place: MapPlace; selected: boolean }) {
  return (
    <>
      <PlacePin place={place} className={selected ? "size-10" : "size-8"} />
      {selected && (
        <span
          aria-hidden="true"
          className="panel-raised absolute top-full left-1/2 -translate-x-1/2 rounded-full px-2.5 py-0.5 text-sm font-semibold whitespace-nowrap"
        >
          {place.name}
        </span>
      )}
    </>
  );
}
