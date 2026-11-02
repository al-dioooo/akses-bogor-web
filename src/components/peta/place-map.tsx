"use client";

import "mapbox-gl/dist/mapbox-gl.css";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { MapToken } from "@/lib/api";
import { hasWebGL, readTheme, watchPreferences } from "@/lib/preferences";
import { buttonClass } from "@/ui/button-styles";
import { Icon } from "@/ui/icon";
import { IconArrowRight, IconFocusCentered, IconList, IconMap2, IconMinus, IconPlus, IconX, type Glyph } from "@/ui/icons";
import { CATEGORY_ICON } from "@/ui/place-icons";
import { StatusBadge } from "@/ui/status-badge";
import { StatusPin } from "@/ui/status-pin";
import type { MapHandle } from "./map/mount";
import { PlaceList } from "./place-list";
import type { MapPlace } from "./places";

type MapState = "awal" | "memuat" | "siap" | "tanpa-webgl" | "galat";

async function fetchToken(): Promise<MapToken> {
  const response = await fetch("/peta/kunci", { cache: "no-store" });
  if (!response.ok) throw new Error("token peta tidak tersedia");
  return (await response.json()) as MapToken;
}

/**
 * Peta Kota Bogor (FR-05, ADR-0016) dengan marker per status, kontrol zoom, ringkasan lokasi yang dipilih, dan daftar
 * lokasi di tampilan peta sebagai alternatif untuk pembaca layar. Mapbox GL JS dimuat hanya bila WebGL ada; tanpa
 * JavaScript, WebGL, atau token, daftar tetap berisi semua lokasi.
 */
export function PlaceMap({ places, listHref, legend }: { places: MapPlace[]; listHref: string; legend: ReactNode }) {
  const t = useTranslations("Peta");
  const tk = useTranslations("Kategori");
  const ts = useTranslations("Status");
  const frame = useRef<HTMLDivElement>(null);
  const container = useRef<HTMLDivElement>(null);
  const summaryHeading = useRef<HTMLHeadingElement>(null);
  const [map, setMap] = useState<MapHandle | null>(null);
  const [state, setState] = useState<MapState>("awal");
  const [attempt, setAttempt] = useState(0);
  const [inView, setInView] = useState<Set<string> | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let mounted: MapHandle | undefined;
    (async () => {
      if (!hasWebGL()) return setState("tanpa-webgl");
      setState("memuat");
      try {
        const [{ mountMap }, token] = await Promise.all([import("./map/mount"), fetchToken()]);
        if (cancelled || !container.current) return;
        mounted = mountMap({
          container: container.current,
          token,
          renewToken: fetchToken,
          places,
          night: readTheme().night,
          locale: {
            "Map.Title": t("map.title"),
            "AttributionControl.ToggleAttribution": t("map.attribution"),
            "LogoControl.Title": t("map.logo"),
            "ScrollZoomBlocker.CtrlMessage": t("map.ctrlScroll"),
            "ScrollZoomBlocker.CmdMessage": t("map.cmdScroll"),
            "TouchPanBlocker.Message": t("map.twoFingers"),
          },
          describedBy: "petunjuk-peta",
          markerLabel: (place) => t("marker", { name: place.name, category: tk(place.category), status: ts(place.status) }),
          onReady: () => setState("siap"),
          onFail: () => setState("galat"),
          onView: (ids) => setInView(new Set(ids)),
          onSelect: setSelected,
        });
        setMap(mounted);
      } catch {
        if (!cancelled) setState("galat");
      }
    })();
    const unwatch = watchPreferences(() => mounted?.setNight(readTheme().night));
    return () => {
      cancelled = true;
      unwatch();
      mounted?.destroy();
      setMap(null);
    };
  }, [places, attempt, t, tk, ts]);

  // Ringkasan menerima fokus setiap kali lokasi dipilih, supaya pembaca layar langsung membacanya.
  useEffect(() => {
    map?.setSelected(selected);
    if (selected) summaryHeading.current?.focus();
  }, [map, selected]);

  // Escape menutup ringkasan selama fokus ada di peta, lalu fokus kembali ke marker lokasi itu.
  useEffect(() => {
    const element = frame.current;
    if (!selected || !element) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setSelected(null);
      map?.markers.get(selected)?.focus();
    };
    element.addEventListener("keydown", onKey);
    return () => element.removeEventListener("keydown", onKey);
  }, [map, selected]);

  const ready = state === "siap";
  const place = selected ? places.find((p) => p.id === selected) : undefined;
  const shown = ready && inView ? places.filter((p) => inView.has(p.id)) : places;

  const close = () => {
    const marker = selected ? map?.markers.get(selected) : undefined;
    setSelected(null);
    marker?.focus();
  };
  const showOnMap = (id: string) => {
    map?.show(id);
    setSelected(id);
  };

  return (
    <>
      <a
        href="#judul-daftar-peta"
        className="sr-only focus:not-sr-only focus:inline-flex focus:min-h-11 focus:items-center focus:self-start focus:rounded-full focus:bg-surface-inverse focus:px-4 focus:text-text-on-inverse"
      >
        {t("map.skip")}
      </a>
      <div ref={frame} className="peta-frame relative h-[clamp(22rem,62svh,44rem)] overflow-hidden rounded-3xl border border-border-subtle bg-bg-sunken">
        {ready && (
          <div
            role="group"
            aria-label={t("controls.label")}
            className="panel-raised absolute top-3 right-3 z-10 flex flex-col overflow-hidden rounded-2xl"
          >
            <ControlButton label={t("controls.zoomIn")} icon={IconPlus} onClick={() => map?.zoomIn()} />
            <ControlButton label={t("controls.zoomOut")} icon={IconMinus} onClick={() => map?.zoomOut()} />
            <ControlButton label={t("controls.reset")} icon={IconFocusCentered} onClick={() => map?.reset()} />
          </div>
        )}
        {/* Mapbox memberi kontainer peta position: relative, jadi ukurannya diambil dari bingkai lewat size-full. */}
        <div ref={container} className="size-full" />
        {state === "memuat" && (
          <p role="status" className="absolute inset-0 grid place-items-center font-semibold text-text-secondary">
            {t("map.loading")}
          </p>
        )}
        {(state === "tanpa-webgl" || state === "galat") && (
          <div role="alert" className="absolute inset-0 flex flex-col items-start justify-center gap-3 p-6 sm:p-10">
            <span className="grid size-12 place-items-center rounded-full bg-surface-raised text-icon-brand">
              <Icon icon={IconMap2} className="size-6" />
            </span>
            <p className="font-heading text-xl font-bold">{t(state === "galat" ? "map.failedTitle" : "map.noWebglTitle")}</p>
            <p className="text-text-secondary">{t("map.fallbackBody")}</p>
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
        <noscript>
          <p className="absolute inset-0 grid place-items-center p-6 text-center font-semibold">{t("map.noscript")}</p>
        </noscript>
        {place && (
          <section
            aria-labelledby="judul-ringkasan"
            className="panel-raised absolute inset-x-3 bottom-16 z-20 flex flex-col items-start gap-3 rounded-2xl p-5 pr-14 sm:inset-x-auto sm:top-3 sm:bottom-auto sm:left-3 sm:w-80"
          >
            <p className="inline-flex items-center gap-1.5 text-sm font-semibold">
              <Icon icon={CATEGORY_ICON[place.category]} className="size-4.5 text-icon-brand" />
              {tk(place.category)}
            </p>
            <h2 id="judul-ringkasan" ref={summaryHeading} tabIndex={-1} className="font-heading text-xl leading-tight font-bold">
              {place.name}
            </h2>
            <StatusBadge status={place.status} size="sm" />
            <Link href={`/lokasi/${place.id}`} className={buttonClass("primary", "sm")}>
              {t("summary.detail")}
              <Icon icon={IconArrowRight} />
            </Link>
            <button
              type="button"
              onClick={close}
              aria-label={t("summary.close")}
              className="absolute top-2 right-2 grid size-11 place-items-center rounded-full hover:bg-surface-hover"
            >
              <Icon icon={IconX} />
            </button>
          </section>
        )}
      </div>
      {ready && (
        <p id="petunjuk-peta" className="-mt-2 text-sm text-text-secondary">
          {t("map.hint")}
        </p>
      )}
      {map &&
        places.map((p) => {
          const element = map.markers.get(p.id);
          return element ? createPortal(<MarkerFace place={p} selected={p.id === selected} />, element, p.id) : null;
        })}
      {legend}
      {places.length > 0 && (
        <section aria-labelledby="judul-daftar-peta" className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 id="judul-daftar-peta" tabIndex={-1} className="font-heading text-lg font-bold">
              {t(ready ? "list.inView" : "list.title")}
            </h2>
            {ready && (
              <p role="status" className="text-sm text-text-secondary">
                {t("list.count", { shown: shown.length, total: places.length })}
              </p>
            )}
          </div>
          {shown.length > 0 ? (
            <PlaceList places={shown} onShow={ready ? showOnMap : undefined} />
          ) : (
            <p className="rounded-2xl bg-bg-sunken p-5 text-text-secondary">{t("list.none")}</p>
          )}
        </section>
      )}
    </>
  );
}

function ControlButton({ label, icon, onClick }: { label: string; icon: Glyph; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="grid size-11 place-items-center text-text-primary not-last:border-b not-last:border-border-subtle hover:bg-surface-hover"
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
