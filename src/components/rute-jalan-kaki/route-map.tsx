"use client";

import "mapbox-gl/dist/mapbox-gl.css";
import type { GeoJSONSource, Map as MapboxMap } from "mapbox-gl";
import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";
import type { Obstacle, WalkingRoute } from "@/lib/agen-rute";
import type { MapToken } from "@/lib/api";
import { hasWebGL, motionReduced, readTheme, watchPreferences } from "@/lib/preferences";

const STYLE = { terang: "mapbox://styles/mapbox/light-v11", gelap: "mapbox://styles/mapbox/dark-v11" };
const AREA: [[number, number], [number, number]] = [
  [106.5, -6.9],
  [107.1, -6.3],
];
const RENEW_BEFORE_MS = 5 * 60_000;

async function fetchToken(): Promise<MapToken> {
  const response = await fetch("/peta/kunci", { cache: "no-store" });
  if (!response.ok) throw new Error("token peta tidak tersedia");
  return (await response.json()) as MapToken;
}

/** Warna token desain dalam bentuk yang dibaca Mapbox, mis. "#6440e8". */
const token = (name: string, fallback: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;

/** Rute Mapbox atau rute OpenStreetMap (ADR-0055); peta hanya memakai garis dan tujuannya. */
type Props = { route: Pick<WalkingRoute, "geometry" | "destination">; obstacles: Obstacle[]; /** Nama tujuan untuk label peta. */ name: string };

/** Jarak dua titik [bujur, lintang] dalam meter (haversine). */
function meters([lng1, lat1]: [number, number], [lng2, lat2]: [number, number]) {
  const rad = Math.PI / 180;
  const h = Math.sin(((lat2 - lat1) * rad) / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(((lng2 - lng1) * rad) / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.sqrt(h));
}

/**
 * Titik di garis rute sejauh `distance` meter dari awal. API mengirim jarak hambatan dari awal rute, bukan koordinatnya,
 * jadi hambatan digambar di titik terdekatnya pada garis rute.
 */
export function pointAlong(line: [number, number][], distance: number): [number, number] {
  let left = distance;
  for (let i = 1; i < line.length; i++) {
    const length = meters(line[i - 1]!, line[i]!);
    if (left <= length && length > 0) {
      const f = left / length;
      return [line[i - 1]![0] + (line[i]![0] - line[i - 1]![0]) * f, line[i - 1]![1] + (line[i]![1] - line[i - 1]![1]) * f];
    }
    left -= length;
  }
  return line.at(-1)!;
}

/**
 * Peta rute jalan kaki (ADR-0042): garis rute Mapbox, titik awal, tujuan, dan hambatan OpenStreetMap. Peta hanya
 * gambaran; langkah dan daftar hambatan di halaman berisi informasi yang sama, jadi marker tidak masuk urutan Tab dan
 * disembunyikan dari pembaca layar. Atribusi Mapbox dan OpenStreetMap selalu tampil penuh (ADR-0016).
 */
export function RouteMap({ route, obstacles, name }: Props) {
  const t = useTranslations("RuteJalanKaki.rute");
  const tp = useTranslations("Peta.map");
  // Satu percakapan bisa punya beberapa kartu rute, jadi id petunjuknya unik per peta.
  const hintId = useId();
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MapboxMap | null>(null);
  const [state, setState] = useState<"memuat" | "siap" | "tidak-ada">("memuat");
  const data = useRef({ route, obstacles, name });
  const redraw = useRef<(() => void) | null>(null);
  // Hambatan datang setelah rute; peta yang sudah siap digambar ulang tanpa dibuat ulang.
  useEffect(() => {
    data.current = { route, obstacles, name };
    if (state === "siap") redraw.current?.();
  }, [route, obstacles, name, state]);

  useEffect(() => {
    let cancelled = false;
    let renewTimer: number | undefined;
    let unwatch: (() => void) | undefined;
    (async () => {
      if (!hasWebGL()) return setState("tidak-ada");
      try {
        const [{ default: mapboxgl }, first] = await Promise.all([import("mapbox-gl"), fetchToken()]);
        if (cancelled || !container.current) return;
        let current = first;
        mapboxgl.accessToken = current.token;
        let night = readTheme().night;
        const coordinates = data.current.route.geometry.coordinates;
        const bounds = coordinates.reduce((box, point) => box.extend(point), new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]));
        const instance = new mapboxgl.Map({
          container: container.current,
          style: night ? STYLE.gelap : STYLE.terang,
          bounds,
          fitBoundsOptions: { padding: 48, maxZoom: 17 },
          maxBounds: AREA,
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
        canvas.setAttribute("aria-label", t("mapLabel", { name: data.current.name }));
        canvas.setAttribute("aria-describedby", hintId);

        // Garis, titik awal, tujuan, dan hambatan digambar ulang setiap kali gaya peta dimuat, termasuk saat tema berganti.
        const draw = () => {
          const { route: r, obstacles: o } = data.current;
          const line = { type: "Feature" as const, properties: {}, geometry: r.geometry };
          const ends = {
            type: "FeatureCollection" as const,
            features: [r.geometry.coordinates[0], r.geometry.coordinates.at(-1)!].map((point, i) => ({
              type: "Feature" as const,
              properties: { end: i === 0 ? "awal" : "tujuan" },
              geometry: { type: "Point" as const, coordinates: point },
            })),
          };
          if (instance.getSource("rute")) {
            (instance.getSource("rute") as GeoJSONSource).setData(line);
            (instance.getSource("ujung") as GeoJSONSource).setData(ends);
          } else {
            instance.addSource("rute", { type: "geojson", data: line });
            instance.addSource("ujung", { type: "geojson", data: ends });
            instance.addLayer({ id: "rute-tepi", type: "line", source: "rute", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": token("--color-surface-raised", "#ffffff"), "line-width": 9 } });
            instance.addLayer({ id: "rute", type: "line", source: "rute", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": token("--color-brand-fill", "#6440e8"), "line-width": 5 } });
            instance.addLayer({
              id: "ujung",
              type: "circle",
              source: "ujung",
              paint: {
                "circle-radius": ["match", ["get", "end"], "tujuan", 9, 7],
                "circle-color": ["match", ["get", "end"], "tujuan", token("--color-text-primary", "#12131a"), token("--color-brand-fill", "#6440e8")],
                "circle-stroke-color": token("--color-surface-raised", "#ffffff"),
                "circle-stroke-width": 3,
              },
            });
          }
          const points = {
            type: "FeatureCollection" as const,
            features: o.map((feature) => ({ type: "Feature" as const, properties: {}, geometry: { type: "Point" as const, coordinates: pointAlong(r.geometry.coordinates, feature.alongRouteMeters) } })),
          };
          if (instance.getSource("hambatan")) {
            (instance.getSource("hambatan") as GeoJSONSource).setData(points);
          } else {
            instance.addSource("hambatan", { type: "geojson", data: points });
            instance.addLayer({
              id: "hambatan",
              type: "circle",
              source: "hambatan",
              paint: { "circle-radius": 6, "circle-color": token("--color-status-partial-solid", "#ffcc33"), "circle-stroke-color": token("--color-text-primary", "#12131a"), "circle-stroke-width": 2 },
            });
          }
        };
        redraw.current = draw;
        instance.on("style.load", draw);
        instance.on("load", () => setState("siap"));
        instance.on("error", () => {
          if (!instance.isStyleLoaded()) setState("tidak-ada");
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
  }, [t, tp, hintId]);

  if (state === "tidak-ada") return <p className="rounded-2xl bg-bg-sunken p-4 text-text-secondary">{t("mapUnavailable")}</p>;
  return (
    <div className="flex flex-col gap-2">
      <p id={hintId} className="text-sm text-text-secondary">
        {t("mapHint")}
      </p>
      <div className="peta-frame relative h-72 overflow-hidden rounded-2xl border border-border-subtle bg-bg-sunken sm:h-96">
        <div ref={container} className="size-full" />
        {state === "memuat" && (
          <p role="status" className="absolute inset-0 grid place-items-center text-text-secondary">
            {t("mapLoading")}
          </p>
        )}
      </div>
    </div>
  );
}
