"use client";

import { useTranslations } from "next-intl";
import { useId, useRef, useState } from "react";
import type { CardTarget, RouteObstacles, RouteTarget, WalkingRoute } from "@/lib/agen-rute";
import type { LatLng } from "@/lib/laporan";
import { buttonClass } from "@/ui/button-styles";
import { Icon } from "@/ui/icon";
import { IconMapPin } from "@/ui/icons";
import { RouteResult, type ObstacleState } from "./route-result";
import { StartPoint } from "./start-point";

type Phase = { kind: "awal" } | { kind: "memuat"; from: LatLng } | { kind: "rute"; route: WalkingRoute } | { kind: "galat"; from: LatLng; message: string };

/** Tujuan kartu dalam bentuk badan route handler rute. */
export const routeTarget = (target: CardTarget): RouteTarget =>
  target.kind === "aksesbogor" ? { placeId: target.placeId } : { osm: { type: target.osmType, id: target.osmId } };

async function post<T>(url: string, body: unknown): Promise<{ ok: true; data: T } | { ok: false; message?: string }> {
  try {
    const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const data = (await response.json().catch(() => ({}))) as T & { pesan?: string };
    return response.ok ? { ok: true, data } : { ok: false, message: data.pesan };
  } catch {
    return { ok: false };
  }
}

type Props = {
  target: CardTarget;
  name: string | null;
  /** Lokasi tujuan bila diketahui dari kartu tempat yang sama, untuk tengah peta pemilih titik awal. */
  destination?: LatLng;
};

/**
 * Kartu rute jalan kaki (ADR-0042). Agen hanya menyebut tujuan; web sendiri yang meminta rute dengan posisi pengguna
 * lewat /laporkan/bantu-memetakan/rute, lalu hambatan di dekatnya. Posisi itu tidak pernah dikirim ke agen dan tidak
 * disimpan setelah rute dimuat.
 */
export function RouteCard({ target, name, destination }: Props) {
  const t = useTranslations("RuteJalanKaki");
  const titleId = useId();
  const [phase, setPhase] = useState<Phase>({ kind: "awal" });
  const [obstacles, setObstacles] = useState<ObstacleState>({ kind: "memuat" });
  const request = useRef(0);
  const label = name ?? t("unnamed");

  async function start(from: LatLng) {
    const id = ++request.current;
    setPhase({ kind: "memuat", from });
    setObstacles({ kind: "memuat" });
    const route = await post<WalkingRoute>("/laporkan/bantu-memetakan/rute", { from, ...routeTarget(target) });
    if (id !== request.current) return;
    if (!route.ok) return setPhase({ kind: "galat", from, message: route.message ?? t("rute.failed") });
    setPhase({ kind: "rute", route: route.data });
    const found = await post<RouteObstacles>("/laporkan/bantu-memetakan/hambatan", { polyline: route.data.polyline });
    if (id !== request.current) return;
    setObstacles(found.ok ? { kind: "siap", data: found.data } : { kind: "galat" });
  }

  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-4 rounded-3xl border-2 border-border-subtle bg-surface-raised p-4 sm:p-5">
      <h3 id={titleId} className="flex items-start gap-2 font-heading text-xl font-bold">
        <Icon icon={IconMapPin} className="mt-0.5 size-6 shrink-0 text-icon-brand" />
        {t("title", { name: label })}
      </h3>
      {phase.kind === "awal" && <StartPoint destination={destination} onStart={start} />}
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
            <button type="button" onClick={() => start(phase.from)} className={buttonClass("primary", "md")}>
              {t("rute.retry")}
            </button>
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
