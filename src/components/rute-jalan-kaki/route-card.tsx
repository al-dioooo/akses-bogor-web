"use client";

import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";
import type { CardTarget, RouteObstacles, RouteTarget, WalkingRoute } from "@/lib/agen-rute";
import type { LatLng } from "@/lib/laporan";
import { ACCESSIBLE_OFF, ACCESSIBLE_PROFILES, type AccessibleProfile, type AccessibleRoute } from "@/lib/rute-aksesibel";
import { buttonClass } from "@/ui/button-styles";
import { Icon } from "@/ui/icon";
import { IconCheck, IconMapPin } from "@/ui/icons";
import { RouteResult, type ObstacleState } from "./route-result";
import { StartPoint, type StartPointCopy } from "./start-point";

type Phase =
  | { kind: "awal" }
  | { kind: "memuat"; from: LatLng }
  | { kind: "rute"; from: LatLng; route: WalkingRoute | AccessibleRoute }
  | { kind: "galat"; from: LatLng; message: string; code?: string };

/** Galat rute OSM yang berarti fitur itu menyala di API, jadi pilihan profil tetap ditampilkan. */
const ACCESSIBLE_ERRORS = new Set(["tanpa_rute_kursi_roda", "rute_tidak_ditemukan", "jauh_dari_jalur"]);

/** Route handler web untuk rute dan hambatan; bawaannya milik Bantu memetakan, yang mewajibkan akun. */
export type RouteEndpoints = { route: string; obstacles: string };
export const CONTRIBUTOR_ENDPOINTS: RouteEndpoints = { route: "/laporkan/bantu-memetakan/rute", obstacles: "/laporkan/bantu-memetakan/hambatan" };

/** Tujuan kartu dalam bentuk badan route handler rute. */
export const routeTarget = (target: CardTarget): RouteTarget =>
  target.kind === "aksesbogor" ? { placeId: target.placeId } : { osm: { type: target.osmType, id: target.osmId } };

async function post<T>(url: string, body: unknown): Promise<{ ok: true; data: T } | { ok: false; code?: string; message?: string }> {
  try {
    const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const data = (await response.json().catch(() => ({}))) as T & { galat?: string; pesan?: string };
    return response.ok ? { ok: true, data } : { ok: false, code: data.galat, message: data.pesan };
  } catch {
    return { ok: false };
  }
}

type Props = {
  target: CardTarget;
  name: string | null;
  /** Lokasi tujuan bila diketahui dari kartu tempat yang sama, untuk tengah peta pemilih titik awal. */
  destination?: LatLng;
  endpoints?: RouteEndpoints;
  /** Titik awal yang sudah dipilih di halaman, mis. di Tanya rute (ADR-0050): rute langsung dimuat tanpa langkah titik awal. */
  from?: LatLng;
  /** Teks penjelasan titik awal bila berbeda dari Bantu memetakan. */
  startCopy?: StartPointCopy;
};

/**
 * Kartu rute jalan kaki (ADR-0042, ADR-0050). Agen hanya menyebut tujuan; web sendiri yang meminta rute dengan posisi
 * pengguna lewat route handler `endpoints` (Bantu memetakan atau Tanya rute), lalu hambatan di dekatnya. Posisi itu tidak pernah dikirim ke agen dan tidak
 * disimpan setelah rute dimuat.
 *
 * Rute diminta dulu dari data OpenStreetMap dengan profil yang dipilih (ADR-0055). Bila API menjawab fitur itu belum
 * aktif, kartu memakai rute jalan kaki Mapbox dengan peringatannya, tanpa pilihan profil.
 */
export function RouteCard({ target, name, destination, endpoints = CONTRIBUTOR_ENDPOINTS, from: initialFrom, startCopy }: Props) {
  const t = useTranslations("RuteJalanKaki");
  const titleId = useId();
  const [phase, setPhase] = useState<Phase>(() => (initialFrom ? { kind: "memuat", from: initialFrom } : { kind: "awal" }));
  const [obstacles, setObstacles] = useState<ObstacleState>({ kind: "memuat" });
  const [profile, setProfile] = useState<AccessibleProfile>("kursi_roda");
  /** Apakah API punya rute OpenStreetMap: null sampai jawaban pertama. */
  const [accessible, setAccessible] = useState<boolean | null>(null);
  const request = useRef(0);
  const label = name ?? t("unnamed");
  const profileId = useId();
  const hintId = useId();

  /** Meminta rute lalu hambatannya; jawaban permintaan yang sudah digantikan diabaikan. */
  async function load(from: LatLng, id: number, chosen: AccessibleProfile, osm: boolean | null) {
    let route: Awaited<ReturnType<typeof post<WalkingRoute | AccessibleRoute>>> | null = null;
    if (osm !== false) {
      route = await post<AccessibleRoute>(endpoints.route, { from, ...routeTarget(target), profil: chosen });
      if (id !== request.current) return;
      if (!route.ok && route.code === ACCESSIBLE_OFF) {
        setAccessible(false);
        route = null;
      } else if (route.ok || ACCESSIBLE_ERRORS.has(route.code ?? "")) {
        setAccessible(true);
      }
    }
    // Rute OpenStreetMap belum aktif di API: rute jalan kaki Mapbox, yang selalu membawa peringatannya sendiri.
    route ??= await post<WalkingRoute>(endpoints.route, { from, ...routeTarget(target) });
    if (id !== request.current) return;
    if (!route.ok) return setPhase({ kind: "galat", from, message: route.message ?? t("rute.failed"), code: route.code });
    setPhase({ kind: "rute", from, route: route.data });
    const found = await post<RouteObstacles>(endpoints.obstacles, { polyline: route.data.polyline });
    if (id !== request.current) return;
    setObstacles(found.ok ? { kind: "siap", data: found.data } : { kind: "galat" });
  }

  function start(from: LatLng, chosen = profile) {
    const id = ++request.current;
    setPhase({ kind: "memuat", from });
    setObstacles({ kind: "memuat" });
    void load(from, id, chosen, accessible);
  }

  /** Ganti profil dan hitung ulang rute dari titik awal yang sama. */
  function choose(next: AccessibleProfile) {
    if (next === profile) return;
    setProfile(next);
    if (phase.kind !== "awal") start(phase.from, next);
  }

  // Titik awal dari halaman: rute dimuat sekali saat kartu tampil. Titik yang diganti sesudahnya tidak mengubah kartu ini.
  useEffect(() => {
    if (initialFrom) void load(initialFrom, ++request.current, profile, accessible);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hanya sekali saat kartu tampil.
  }, []);

  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-4 rounded-3xl border-2 border-border-subtle bg-surface-raised p-4 sm:p-5">
      <h3 id={titleId} className="flex items-start gap-2 font-heading text-xl font-bold">
        <Icon icon={IconMapPin} className="mt-0.5 size-6 shrink-0 text-icon-brand" />
        {t("title", { name: label })}
      </h3>
      {phase.kind === "awal" && <StartPoint destination={destination} onStart={(from) => start(from)} copy={startCopy} />}
      {accessible && phase.kind !== "awal" && (
        <div className="flex flex-col gap-2">
          <p id={profileId} className="font-semibold">
            {t("profil.label")}
          </p>
          <div role="group" aria-labelledby={profileId} aria-describedby={hintId} className="flex flex-wrap gap-2">
            {ACCESSIBLE_PROFILES.map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={profile === option}
                onClick={() => choose(option)}
                className={buttonClass(profile === option ? "primary" : "outline", "md")}
              >
                {profile === option && <Icon icon={IconCheck} className="size-5" />}
                {t(`profil.${option}`)}
              </button>
            ))}
          </div>
          <p id={hintId} className="text-sm text-text-secondary">
            {t("profil.hint")}
          </p>
        </div>
      )}
      {phase.kind === "memuat" && (
        <p role="status" className="text-text-secondary">
          {t("rute.loading")}
        </p>
      )}
      {phase.kind === "galat" && (
        <div className="flex flex-col items-start gap-3">
          <p role="alert" className="font-semibold">
            {phase.message}
          </p>
          <div className="flex flex-wrap gap-3">
            {phase.code === "tanpa_rute_kursi_roda" ? (
              <button type="button" onClick={() => choose("jalan_kaki")} className={buttonClass("primary", "md")}>
                {t("profil.noWheelchairPath")}
              </button>
            ) : (
              <button type="button" onClick={() => start(phase.from)} className={buttonClass("primary", "md")}>
                {t("rute.retry")}
              </button>
            )}
            <button type="button" onClick={() => setPhase({ kind: "awal" })} className={buttonClass("outline", "md")}>
              {t("rute.changeStart")}
            </button>
          </div>
        </div>
      )}
      {phase.kind === "rute" && <RouteResult route={phase.route} name={label} obstacles={obstacles} onChangeStart={() => setPhase({ kind: "awal" })} />}
    </section>
  );
}
