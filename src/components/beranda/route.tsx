import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { getStats } from "@/lib/api";
import { SectionHeading } from "@/ui/section-heading";
import { ROUTE, routeNumber } from "../rute";
import { RouteScene } from "./route-scene";

/**
 * Empat fasilitas (ADR-0017) sebagai rute dari halte sampai lantai atas. Di layar lebar kamera adegan 3D berpindah
 * ke tiap titik (ADR-0028); selain itu tiap baris memakai close-up diam dari titik yang sama.
 */
export async function Route() {
  const [t, tf, tr] = await Promise.all([getTranslations("Beranda.guide"), getTranslations("Fasilitas"), getTranslations("Rute")]);
  return (
    <section aria-labelledby="judul-rute" className="page-width flex flex-col gap-14 lg:gap-18">
      <SectionHeading id="judul-rute" label={tr("label")} title={t("title")} accent={t("accent")} intro={t("intro")} />
      <RouteScene>
        <ol className="route-list flex flex-col gap-10 lg:gap-8">
          {ROUTE.map(({ facility, image }, index) => {
            const number = routeNumber(index);
            return (
              <li key={facility} data-stop={facility} className="route-stop reveal grid items-center gap-6 lg:grid-cols-2 lg:gap-16">
                <span className="route-still relative block aspect-[5/4] overflow-hidden rounded-[2rem]">
                  <Image src={image} alt="" placeholder="blur" sizes="(min-width: 64rem) 36rem, 100vw" className="size-full object-cover" />
                  <span
                    aria-hidden="true"
                    className="absolute top-5 left-5 grid size-13 place-items-center rounded-full border-3 border-brand-fill bg-surface-raised font-mono text-base font-semibold text-text-brand"
                  >
                    {number}
                  </span>
                </span>
                <div className="flex max-w-md flex-col items-start gap-3.5">
                  <p className="font-mono text-xs font-medium tracking-[0.08em] text-text-secondary uppercase">
                    {number} · {tr(`where.${facility}`)}
                  </p>
                  <h3 className="display text-[clamp(2.1rem,1.4rem+1.8vw,3.2rem)] leading-none">{tf(facility)}</h3>
                  <p className="text-lg text-text-secondary">{t(`facility.${facility}`)}</p>
                  {facility === "ramp" && (
                    <Suspense>
                      <RampFact />
                    </Suspense>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </RouteScene>
    </section>
  );
}

/** "5 dari 7 lokasi punya pintu masuk tanpa tangga"; tidak tampil bila API gagal. */
async function RampFact() {
  const [t, stats] = await Promise.all([getTranslations("Beranda.guide"), getStats().catch(() => null)]);
  if (!stats?.places) return null;
  return (
    <p className="mt-3 flex flex-col gap-0.5 rounded-2xl bg-surface-brand-subtle px-4.5 py-3.5 text-sm font-semibold text-text-brand">
      <span className="display text-3xl leading-none">{t("rampFact", { count: stats.stepFreeEntrance, total: stats.places })}</span>
      {t("rampFactLabel")}
    </p>
  );
}
