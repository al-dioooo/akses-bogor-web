import Image, { type StaticImageData } from "next/image";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import guidingBlock from "@/assets/ilustrasi/rute-01-guiding-block.webp";
import ramp from "@/assets/ilustrasi/rute-02-ramp.webp";
import toilet from "@/assets/ilustrasi/rute-03-toilet.webp";
import lift from "@/assets/ilustrasi/rute-04-lift.webp";
import { getStats, type Facility } from "@/lib/api";
import { SectionHeading } from "@/ui/section-heading";

/** Urutan fasilitas saat orang datang ke sebuah tempat; nomornya sama dengan pin di hero. */
const ROUTE: { facility: Facility; image: StaticImageData }[] = [
  { facility: "guiding_block", image: guidingBlock },
  { facility: "ramp", image: ramp },
  { facility: "toilet_difabel", image: toilet },
  { facility: "lift", image: lift },
];

/** Empat fasilitas (ADR-0017) sebagai rute dari halte sampai lantai atas, dengan close-up ilustrasi. */
export async function Route() {
  const [t, tf] = await Promise.all([getTranslations("Beranda.guide"), getTranslations("Fasilitas")]);
  return (
    <section aria-labelledby="judul-rute" className="page-width flex flex-col gap-14 lg:gap-18">
      <SectionHeading id="judul-rute" label={t("eyebrow")} title={t("title")} accent={t("accent")} intro={t("intro")} />
      <ol className="flex flex-col gap-10 lg:gap-8">
        {ROUTE.map(({ facility, image }, index) => {
          const number = String(index + 1).padStart(2, "0");
          return (
            <li key={facility} className="reveal grid items-center gap-6 lg:grid-cols-2 lg:gap-16">
              <span className={`relative block aspect-[5/4] overflow-hidden rounded-[2rem] ${index % 2 ? "lg:order-2" : ""}`}>
                <Image src={image} alt="" placeholder="blur" sizes="(min-width: 64rem) 36rem, 100vw" className="size-full object-cover" />
                <span
                  aria-hidden="true"
                  className="absolute top-5 left-5 grid size-13 place-items-center rounded-full border-3 border-brand-fill bg-surface-raised font-mono text-base font-semibold text-text-brand"
                >
                  {number}
                </span>
              </span>
              <div className={`flex max-w-md flex-col items-start gap-3.5 ${index % 2 ? "lg:justify-self-end" : ""}`}>
                <p className="font-mono text-xs font-medium tracking-[0.08em] text-text-secondary uppercase">
                  {number} · {t(`where.${facility}`)}
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
