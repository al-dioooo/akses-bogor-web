"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useId, useRef } from "react";
import type { RouteObstacles, WalkingRoute } from "@/lib/agen-rute";
import { isAccessibleRoute, type AccessibleRoute } from "@/lib/rute-aksesibel";
import { buttonClass } from "@/ui/button-styles";
import { Icon } from "@/ui/icon";
import { IconAlertTriangle, IconExternalLink, IconMapPin } from "@/ui/icons";
import { distanceText, walkingMinutes } from "./jarak";
import { RouteCoverage } from "./route-coverage";
import { RouteMap } from "./route-map";

export type ObstacleState = { kind: "memuat" } | { kind: "siap"; data: RouteObstacles } | { kind: "galat" };

const linkClass = "font-semibold text-text-brand underline underline-offset-2";

/**
 * Rute yang ditampilkan langsung kepada pengguna: ringkasan, peta, langkah, dan hambatan OpenStreetMap. Rute Mapbox
 * (ADR-0042) membawa kalimat peringatan tetap dan atribusi Mapbox; rute OpenStreetMap dari Valhalla (ADR-0055) membawa
 * label tetap, kelengkapan data, dan peringatannya sendiri. Tidak ada bagian yang lewat model.
 */
export function RouteResult({
  route,
  name,
  obstacles,
  onChangeStart,
}: {
  route: WalkingRoute | AccessibleRoute;
  name: string;
  obstacles: ObstacleState;
  onChangeStart: () => void;
}) {
  const t = useTranslations("RuteJalanKaki.rute");
  const th = useTranslations("RuteJalanKaki.hambatan");
  const format = useFormatter();
  const summary = useRef<HTMLParagraphElement>(null);
  const stepsId = useId();
  const obstaclesId = useId();
  // Fokus pindah ke ringkasan rute begitu rute tampil, supaya pembaca layar langsung membacanya.
  useEffect(() => summary.current?.focus(), []);

  return (
    <div className="flex flex-col gap-5">
      <p ref={summary} tabIndex={-1} className="text-lg font-semibold">
        {t(isAccessibleRoute(route) && route.profil === "kursi_roda" ? "summaryWheelchair" : "summary", {
          distance: distanceText(format, route.distanceMeters),
          minutes: walkingMinutes(route.durationSeconds),
        })}
      </p>

      {isAccessibleRoute(route) ? (
        <RouteCoverage route={route} />
      ) : (
        <div className="flex gap-3 rounded-2xl border-2 border-status-partial-fg bg-status-partial-bg p-4 text-text-primary">
          <Icon icon={IconAlertTriangle} className="mt-0.5 size-6 shrink-0 text-status-partial-fg" />
          <p>
            <strong className="block">{t("warningTitle")}</strong>
            {route.warning}
          </p>
        </div>
      )}

      <RouteMap route={route} name={name} obstacles={obstacles.kind === "siap" ? obstacles.data.features : []} />

      <section aria-labelledby={stepsId} className="flex flex-col gap-3">
        <h4 id={stepsId} className="font-heading text-lg font-bold">
          {t("stepsTitle")}
        </h4>
        <ol className="flex flex-col gap-2">
          {route.steps.map((step, index) => (
            <li key={index} className="flex gap-3 rounded-2xl bg-bg-sunken p-3">
              <span aria-hidden="true" className="grid size-7 shrink-0 place-items-center rounded-full bg-surface-raised font-mono text-sm font-bold">
                {index + 1}
              </span>
              <span>
                <span className="block">{step.instruction}</span>
                {step.distanceMeters > 0 && <span className="block text-sm text-text-secondary">{distanceText(format, step.distanceMeters)}</span>}
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby={obstaclesId} aria-busy={obstacles.kind === "memuat"} className="flex flex-col gap-3">
        <h4 id={obstaclesId} className="font-heading text-lg font-bold">
          {th("title")}
        </h4>
        {obstacles.kind === "memuat" && <p role="status">{th("loading")}</p>}
        {obstacles.kind === "galat" && (
          <p role="alert" className="rounded-2xl bg-status-partial-bg p-4 text-text-primary">
            {th("failed")}
          </p>
        )}
        {obstacles.kind === "siap" && (
          <>
            <p className="text-text-secondary">{obstacles.data.note}</p>
            {obstacles.data.features.length === 0 ? (
              <p className="rounded-2xl bg-bg-sunken p-4">{th("none", { meters: obstacles.data.bufferMeters })}</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {obstacles.data.features.map((feature) => (
                  <li key={`${feature.osm.type}-${feature.osm.id}`} className="flex flex-col items-start gap-1 rounded-2xl bg-bg-sunken p-3">
                    <span className="flex items-start gap-2 font-semibold">
                      <Icon icon={IconMapPin} className="mt-0.5 size-5 shrink-0 text-status-partial-fg" />
                      {feature.name ? `${feature.description} (${feature.name})` : feature.description}
                    </span>
                    <span className="text-sm text-text-secondary">
                      {th("position", { along: distanceText(format, feature.alongRouteMeters), distance: distanceText(format, feature.distanceFromRouteMeters) })}
                    </span>
                    <a href={feature.osm.url} target="_blank" rel="noopener noreferrer" className={`inline-flex min-h-11 items-center gap-1.5 ${linkClass}`}>
                      {th("osmLink")}
                      <span className="sr-only"> {th("osmLinkTarget", { description: feature.description })}</span>
                      <Icon icon={IconExternalLink} className="size-4" />
                    </a>
                  </li>
                ))}
              </ul>
            )}
            {obstacles.data.truncated && <p className="text-sm text-text-secondary">{th("truncated")}</p>}
          </>
        )}
      </section>

      <p className="text-sm text-text-secondary">
        {t.rich(isAccessibleRoute(route) ? "attributionOsm" : "attribution", {
          mapbox: (chunks) => (
            <a href="https://www.mapbox.com/about/maps/" target="_blank" rel="noopener noreferrer" className={linkClass}>
              {chunks}
            </a>
          ),
          osm: (chunks) => (
            <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className={linkClass}>
              {chunks}
            </a>
          ),
        })}
      </p>

      <button type="button" onClick={onChangeStart} className={buttonClass("outline", "md", "self-start")}>
        {t("changeStart")}
      </button>
    </div>
  );
}
