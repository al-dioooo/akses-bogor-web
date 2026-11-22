"use client";

import "mapbox-gl/dist/mapbox-gl.css";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import type { DistrictBoundaries, DistrictPriority, MapToken } from "@/lib/api";
import { hasWebGL, readTheme, watchPreferences } from "@/lib/preferences";
import { buttonClass } from "@/ui/button-styles";
import { Icon } from "@/ui/icon";
import { IconFocusCentered, IconList, IconMap2, IconMinus, IconPlus, IconUsers, type Glyph } from "@/ui/icons";
import { StatusPin } from "@/ui/status-pin";
import { MapLegend } from "./legend";
import type { Insets, Rect } from "./map/area";
import type { MapHandle } from "./map/mount";
import { PlaceList } from "./place-list";
import { PlaceSheet, type SheetHeight } from "./place-sheet";
import { PlaceSummary } from "./place-summary";
import { PriorityLegend } from "./priority-legend";
import type { MapPlace } from "./places";

type MapState = "awal" | "memuat" | "siap" | "tanpa-webgl" | "galat";

async function fetchToken(): Promise<MapToken> {
  const response = await fetch("/peta/kunci", { cache: "no-store" });
  if (!response.ok) throw new Error("token peta tidak tersedia");
  return (await response.json()) as MapToken;
}

/** Elemen yang mengambang di atas peta. Marker di bawahnya tidak terlihat, jadi tidak boleh bisa difokus (WCAG 2.4.11). */
const OVERLAYS = ".peta-cari, .peta-lapisan, .peta-kontrol";

/**
 * Bagian atas main yang terpakai pencarian dan kontrol (batas tinggi panel setengah), bagian peta yang tertutup panel
 * daftar, dan persegi setiap elemen yang mengambang di atas peta. Panel samping (mulai 768 px) menutup sisi kiri, lembar
 * bawah menutup bagian bawah dan pencarian bagian atas. Bottom nav di layar lebar menutup bagian bawah, selebar padding
 * bawah main.
 */
function measure(main: HTMLElement): { top: number; insets: Insets; covers: Rect[] } {
  const box = main.getBoundingClientRect();
  const rectOf = (element: Element): Rect => {
    const rect = element.getBoundingClientRect();
    return { left: rect.left - box.left, top: rect.top - box.top, right: rect.right - box.left, bottom: rect.bottom - box.top };
  };
  const below = (selector: string) => {
    const element = main.querySelector(selector);
    return element ? rectOf(element).bottom : 0;
  };
  const covers = [...main.querySelectorAll(OVERLAYS)].map(rectOf).filter((rect) => rect.right > rect.left && rect.bottom > rect.top);
  const top = Math.ceil(Math.max(below(".peta-cari"), below(".peta-kontrol"), below(".peta-lapisan")));
  const panel = main.querySelector(".peta-lembar")?.getBoundingClientRect();
  if (!panel) return { top, insets: { top: 0, right: 0, bottom: 0, left: 0 }, covers };
  const side = panel.width < box.width * 0.75;
  return {
    top,
    insets: side
      ? { top: 0, right: 0, bottom: Number.parseFloat(getComputedStyle(main).paddingBottom) || 0, left: panel.right - box.left }
      : // Atribusi Mapbox duduk di atas lembar, jadi ikut dihitung sebagai bagian yang tertutup.
        { top: below(".peta-cari"), right: 0, bottom: box.bottom - panel.top + 44, left: 0 },
    covers,
  };
}

const NARROW = "(width < 48rem)";
const subscribeNarrow = (onChange: () => void) => {
  const query = matchMedia(NARROW);
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
}: {
  places: MapPlace[];
  listHref: string;
  /** Ada pencarian atau filter, untuk pesan saat tidak ada lokasi. */
  filtered: boolean;
  /** Prioritas kecamatan; null selama API belum membukanya, dan tombol lapisannya tidak tampil. */
  priority?: DistrictPriority | null;
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
  const height: SheetHeight = chosenHeight ?? (narrow ? "kecil" : "setengah");
  const [layer, setLayer] = useState<"mati" | "memuat" | "nyala" | "galat">("mati");
  const [boundaries, setBoundaries] = useState<DistrictBoundaries | null>(null);
  // Lokasi yang dipilih lalu hilang karena filter berganti tidak lagi dianggap terpilih.
  const place = chosen ? places.find((p) => p.id === chosen.id) : undefined;
  const selected = place ? place.id : null;

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
        mounted = mountMap({
          container: container.current,
          insets: measure(main).insets,
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

  // Tinggi panel ditulis di main, karena panel, atribusi Mapbox, dan pesan di atas peta memakai ukuran yang sama.
  useLayoutEffect(() => {
    const main = frame.current?.closest("main");
    if (main) main.dataset.tinggi = chosenHeight ?? "awal";
  }, [chosenHeight]);

  // Lembar penuh di ponsel menutup pencarian, kontrol, dan peta: bagian itu dibuat inert supaya fokus tidak masuk ke
  // sesuatu yang tidak terlihat (WCAG 2.4.11).
  useLayoutEffect(() => {
    const main = frame.current?.closest("main");
    const covered = height === "penuh" && narrow;
    for (const element of main?.querySelectorAll<HTMLElement>(".peta-cari, .peta-lapisan, .peta-kontrol, .peta-peta") ?? []) element.inert = covered;
  }, [height, narrow, state, priority]);

  // Ukuran diukur ulang setelah berhenti berubah (mis. selesai animasi panel), lalu perpindahan yang menunggu dijalankan.
  useEffect(() => {
    const main = frame.current?.closest("main");
    if (!main) return;
    let timer: number | undefined;
    const update = () => {
      const { top, insets, covers } = measure(main);
      main.style.setProperty("--peta-atas", `${top}px`);
      map?.setInsets(insets, covers);
      flushMove();
    };
    const schedule = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(update, 120);
    };
    const observer = new ResizeObserver(schedule);
    for (const selector of [".peta-lembar", ".peta-cari", ".peta-kontrol", ".peta-lapisan"]) {
      const element = main.querySelector(selector);
      if (element) observer.observe(element);
    }
    observer.observe(main);
    update();
    return () => {
      observer.disconnect();
      window.clearTimeout(timer);
    };
  }, [map, state, priority, flushMove]);

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

  // Lapisan prioritas mengikuti peta: digambar ulang bila peta dibuat ulang (mis. setelah Coba lagi).
  useEffect(() => {
    if (!map || !priority) return;
    map.setPriority(layer === "nyala" && boundaries ? { boundaries, levels: Object.fromEntries(priority.districts.map((d) => [d.slug, d.level])) } : null);
  }, [map, priority, layer, boundaries]);

  async function toggleLayer() {
    if (layer === "nyala" || layer === "galat") return setLayer("mati");
    if (boundaries) return setLayer("nyala");
    setLayer("memuat");
    try {
      const response = await fetch("/peta/batas-kecamatan");
      if (!response.ok) throw new Error("batas kecamatan tidak tersedia");
      setBoundaries((await response.json()) as DistrictBoundaries);
      setLayer("nyala");
    } catch {
      setLayer("galat");
    }
  }

  const ready = state === "siap";
  // Daftar mengikuti bagian peta yang terlihat. Sebelum peta siap, tanpa peta, atau saat panel menutup seluruh peta (lembar
  // penuh), daftar berisi semua lokasi.
  const followsView = ready && inView !== null;
  const shown = followsView ? places.filter((p) => inView.has(p.id)) : places;
  // Tanpa lokasi sama sekali, kepala panel (yang selalu terlihat) membawa pesannya: belum ada data, atau filter terlalu
  // sempit.
  const empty = tj(filtered ? "results.emptyTitle" : "results.noDataTitle");
  const status = places.length === 0 ? empty : followsView ? t("list.count", { shown: shown.length, total: places.length }) : t("count", { total: places.length });
  const layerShown = priority && (layer === "nyala" || layer === "galat");

  /** Menutup ringkasan, lalu fokus kembali ke marker atau ke tombol daftar yang membukanya. */
  function closeSummary() {
    if (!chosen) return;
    const { id, from } = chosen;
    setSelected(null);
    if (from === "peta") return map?.markers.get(id)?.focus();
    requestAnimationFrame(() => document.querySelector<HTMLButtonElement>(`[data-tunjukkan="${id}"]`)?.focus());
  }

  function showOnMap(id: string) {
    setSelected({ id, from: "daftar" });
    setHeight("setengah");
    queueMove(id, "show");
  }

  function skipToList(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    if (height === "kecil") setHeight("setengah");
    listHeading.current?.focus();
  }

  return (
    <>
      {priority && (
        <div className="peta-lapisan">
          <button
            type="button"
            aria-label={t("prioritas.toggle")}
            aria-pressed={layer === "nyala" || layer === "galat"}
            disabled={layer === "memuat"}
            onClick={toggleLayer}
            className={buttonClass(layerShown ? "ink" : "outline", "sm", `shadow-[0_8px_20px_-10px_var(--color-shadow-soft)] disabled:opacity-70 ${layerShown ? "" : "bg-surface-raised"}`)}
          >
            <Icon icon={IconUsers} />
            {/* Di ponsel label pendek, supaya tombol dan kontrol peta muat dalam satu baris. */}
            <span className="sm:hidden">{t("prioritas.short")}</span>
            <span className="max-sm:hidden">{t("prioritas.toggle")}</span>
          </button>
          <p role="status" className="sr-only">
            {layer === "memuat" ? t("prioritas.loading") : layer === "nyala" ? t("prioritas.on") : ""}
          </p>
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
        <div role="group" aria-label={t("controls.label")} className="peta-kontrol panel-raised flex overflow-hidden rounded-2xl md:flex-col">
          <ControlButton label={t("controls.zoomIn")} icon={IconPlus} onClick={() => map?.zoomIn()} />
          <ControlButton label={t("controls.zoomOut")} icon={IconMinus} onClick={() => map?.zoomOut()} />
          <ControlButton label={t("controls.reset")} icon={IconFocusCentered} onClick={() => map?.reset()} />
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
        title={t(followsView ? "list.inView" : "list.title")}
        status={status}
        headingRef={listHeading}
        toggleRef={toggle}
      >
        {place ? (
          <PlaceSummary place={place} headingRef={summaryHeading} onClose={closeSummary} />
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
                <p className="text-text-secondary">{tj(filtered ? "results.emptyBody" : "results.noDataBody")}</p>
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
            <MapLegend />
            {places.length > 0 &&
              (shown.length > 0 ? (
                <PlaceList places={shown} labelledBy="judul-daftar-peta" onShow={ready ? showOnMap : undefined} />
              ) : (
                <p className="rounded-2xl bg-bg-sunken p-4 text-text-secondary">{t("list.none")}</p>
              ))}
            {layerShown && (
              <>
                {layer === "galat" && (
                  <p role="alert" className="rounded-2xl bg-status-partial-bg p-4 text-text-primary">
                    {t("prioritas.failed")}
                  </p>
                )}
                <PriorityLegend priority={priority} attribution={boundaries?.attribution ?? null} />
              </>
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

function ControlButton({ label, icon, onClick }: { label: string; icon: Glyph; onClick: () => void }) {
  return (
    <button
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
      <StatusPin status={place.status} className={selected ? "size-10" : "size-8"} />
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
