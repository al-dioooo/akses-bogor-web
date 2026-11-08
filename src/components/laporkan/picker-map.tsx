"use client";

import "mapbox-gl/dist/mapbox-gl.css";
import type { Map as MapboxMap } from "mapbox-gl";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import type { MapToken } from "@/lib/api";
import { hasWebGL, motionReduced, readTheme, watchPreferences } from "@/lib/preferences";
import { Icon } from "@/ui/icon";
import { IconArrowLeft, IconArrowRight, IconArrowUp, IconMapPin, IconMinus, IconPlus, type Glyph } from "@/ui/icons";
import type { Candidate } from "./location-picker";

const STYLE = { terang: "mapbox://styles/mapbox/light-v11", gelap: "mapbox://styles/mapbox/dark-v11" };
/** Tengah Kota Bogor bila belum ada titik. */
const CENTER: [number, number] = [106.7972, -6.5971];
// Peta tidak bisa digeser terlalu jauh dari Kota Bogor (sama dengan halaman Peta).
const AREA: [[number, number], [number, number]] = [
  [106.5, -6.9],
  [107.1, -6.3],
];
/** Zoom saat titik datang dari pencarian atau lokasi perangkat: cukup dekat untuk menunjuk pintu masuk. */
const CLOSE_ZOOM = 17;
/** Jarak geser satu tekan tombol arah, dalam piksel layar. */
const STEP_PX = 80;
const RENEW_BEFORE_MS = 5 * 60_000;

async function fetchToken(): Promise<MapToken> {
  const response = await fetch("/peta/kunci", { cache: "no-store" });
  if (!response.ok) throw new Error("token peta tidak tersedia");
  return (await response.json()) as MapToken;
}

function ControlButton({ label, icon, onClick, className = "" }: { label: string; icon: Glyph; onClick: () => void; className?: string }) {
  return (
    <button type="button" onClick={onClick} className={`grid size-11 place-items-center rounded-xl hover:bg-surface-hover ${className}`}>
      <Icon icon={icon} className="size-5" />
      <span className="sr-only">{label}</span>
    </button>
  );
}

/**
 * Peta pemilih lokasi (ADR-0015, ADR-0016): pin tetap di tengah, peta digeser dengan seret, tombol panah keyboard di
 * peta, atau tombol arah di bawahnya, dan tengah peta menjadi titik terpilih. Tanpa WebGL atau token, peta tidak tampil
 * dan pemilih lokasi tetap bisa dipakai lewat pencarian atau lokasi perangkat.
 */
export function PickerMap({ candidate, onMove }: { candidate: Candidate | null; onMove: (candidate: Candidate) => void }) {
  const t = useTranslations("Laporkan.peta");
  const tp = useTranslations("Peta.map");
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MapboxMap | null>(null);
  const [state, setState] = useState<"memuat" | "siap" | "tidak-ada">("memuat");
  const onMoveRef = useRef(onMove);
  useEffect(() => {
    onMoveRef.current = onMove;
  });
  // Perpindahan yang dibuat kode (titik dari pencarian) tidak dikirim balik sebagai titik dari peta.
  const programmatic = useRef(false);
  const initial = useRef(candidate);

  useEffect(() => {
    let cancelled = false;
    let renewTimer: number | undefined;
    let unwatch: (() => void) | undefined;
    (async () => {
      if (!hasWebGL()) return setState("tidak-ada");
      try {
        const [{ default: mapboxgl }, token] = await Promise.all([import("mapbox-gl"), fetchToken()]);
        if (cancelled || !container.current) return;
        let current = token;
        mapboxgl.accessToken = current.token;
        let night = readTheme().night;
        const start = initial.current?.point;
        const instance = new mapboxgl.Map({
          container: container.current,
          style: night ? STYLE.gelap : STYLE.terang,
          center: start ? [start.lng, start.lat] : CENTER,
          zoom: start ? CLOSE_ZOOM : 13,
          maxBounds: AREA,
          minZoom: 11,
          maxZoom: 19,
          dragRotate: false,
          pitchWithRotate: false,
          touchPitch: false,
          cooperativeGestures: true,
          attributionControl: false,
          locale: {
            "AttributionControl.ToggleAttribution": tp("attribution"),
            "LogoControl.Title": tp("logo"),
            "ScrollZoomBlocker.CtrlMessage": tp("ctrlScroll"),
            "ScrollZoomBlocker.CmdMessage": tp("cmdScroll"),
            "TouchPanBlocker.Message": tp("twoFingers"),
          },
          transformRequest: (url) => {
            if (!/^https:\/\/([a-z0-9-]+\.)*mapbox\.com\//.test(url) || !url.includes("access_token=")) return { url };
            const next = new URL(url);
            next.searchParams.set("access_token", current.token);
            return { url: next.toString() };
          },
        });
        instance.addControl(new mapboxgl.AttributionControl({ compact: false }), "bottom-right");
        instance.touchZoomRotate.disableRotation();
        instance.keyboard.disableRotation();
        instance._prefersReducedMotion = (animation) => motionReduced() && !animation?.essential;
        const canvas = instance.getCanvas();
        canvas.setAttribute("aria-label", t("label"));
        canvas.setAttribute("aria-describedby", "peta-pemilih-petunjuk");
        instance.on("load", () => setState("siap"));
        instance.on("error", () => {
          if (!instance.isStyleLoaded()) setState("tidak-ada");
        });
        instance.on("moveend", () => {
          if (programmatic.current) {
            programmatic.current = false;
            return;
          }
          const { lng, lat } = instance.getCenter();
          onMoveRef.current({ point: { lat, lng }, source: "peta" });
        });
        map.current = instance;
        unwatch = watchPreferences(() => {
          const next = readTheme().night;
          if (next === night) return;
          night = next;
          instance.setStyle(night ? STYLE.gelap : STYLE.terang);
        });
        const renew = async () => {
          try {
            current = await fetchToken();
            mapboxgl.accessToken = current.token;
            renewTimer = window.setTimeout(renew, Math.max(Date.parse(current.expiresAt) - Date.now() - RENEW_BEFORE_MS, 60_000));
          } catch {
            renewTimer = window.setTimeout(renew, 60_000);
          }
        };
        renewTimer = window.setTimeout(renew, Math.max(Date.parse(current.expiresAt) - Date.now() - RENEW_BEFORE_MS, 1000));
      } catch {
        if (!cancelled) setState("tidak-ada");
      }
    })();
    return () => {
      cancelled = true;
      window.clearTimeout(renewTimer);
      unwatch?.();
      map.current?.remove();
      map.current = null;
    };
  }, [t, tp]);

  // Titik dari pencarian atau lokasi perangkat memindah peta ke titik itu.
  const point = candidate?.source !== "peta" ? candidate?.point : undefined;
  useEffect(() => {
    const instance = map.current;
    if (!instance || !point || state !== "siap") return;
    const center = instance.getCenter();
    if (Math.abs(center.lat - point.lat) < 1e-6 && Math.abs(center.lng - point.lng) < 1e-6) return;
    programmatic.current = true;
    instance.easeTo({ center: [point.lng, point.lat], zoom: Math.max(instance.getZoom(), CLOSE_ZOOM) });
  }, [point, state]);

  if (state === "tidak-ada") {
    return <p className="rounded-2xl bg-bg-sunken p-4 text-text-secondary">{t("unavailable")}</p>;
  }

  const pan = (x: number, y: number) => map.current?.panBy([x, y]);
  return (
    <div className="flex flex-col gap-2">
      <p id="peta-pemilih-petunjuk" className="text-sm text-text-secondary">
        {t("hint")}
      </p>
      {/* `peta-frame` memakai gaya fokus dan atribusi yang sama dengan halaman Peta. Mapbox membuat kontainernya
          `position: relative`, jadi ukurannya dari `size-full`, bukan `absolute`. */}
      <div className="peta-frame relative h-72 overflow-hidden rounded-2xl border border-border-subtle bg-bg-sunken sm:h-96">
        <div ref={container} className="size-full" />
        {state === "memuat" && (
          <p role="status" className="absolute inset-0 grid place-items-center text-text-secondary">
            {t("loading")}
          </p>
        )}
        {/* Pin tetap di tengah: ujung bawah ikon tepat di titik tengah peta. */}
        <span aria-hidden="true" className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full text-brand-fill drop-shadow">
          <Icon icon={IconMapPin} className="size-10 fill-surface-raised" />
        </span>
      </div>
      {state === "siap" && (
        <div role="group" aria-label={t("controls")} className="flex flex-wrap items-center gap-1">
          <ControlButton label={t("west")} icon={IconArrowLeft} onClick={() => pan(-STEP_PX, 0)} />
          <ControlButton label={t("north")} icon={IconArrowUp} onClick={() => pan(0, -STEP_PX)} />
          <ControlButton label={t("south")} icon={IconArrowUp} onClick={() => pan(0, STEP_PX)} className="[&>svg]:rotate-180" />
          <ControlButton label={t("east")} icon={IconArrowRight} onClick={() => pan(STEP_PX, 0)} />
          <span aria-hidden="true" className="mx-1 h-6 w-px bg-border-subtle" />
          <ControlButton label={t("zoomIn")} icon={IconPlus} onClick={() => map.current?.zoomIn()} />
          <ControlButton label={t("zoomOut")} icon={IconMinus} onClick={() => map.current?.zoomOut()} />
        </div>
      )}
    </div>
  );
}
