import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Hero } from "@/components/beranda/hero";
import { RoadStats } from "@/components/beranda/road-stats";
import { Route } from "@/components/beranda/route";
import { Statuses } from "@/components/beranda/statuses";
import { Steps } from "@/components/beranda/steps";
import { JsonLd } from "@/components/json-ld";
import { siteJsonLd } from "@/lib/json-ld";
import { pageMetadata } from "@/lib/metadata";
import { siteUrl } from "@/lib/situs";

export function generateMetadata(): Promise<Metadata> {
  return pageMetadata("Beranda", "/");
}

/** Beranda (ADR-0027): hero "Halte ke pintu", pita angka, rute empat fasilitas, arti status, dan alur data. */
export default function Beranda() {
  return (
    <main id="konten" className="flex flex-1 flex-col">
      <SiteJsonLd />
      <Hero />
      <RoadStats />
      <div className="flex flex-col gap-(--spacing-4xl) py-(--spacing-4xl)">
        <Route />
        <Statuses />
      </div>
      <Steps />
    </main>
  );
}

async function SiteJsonLd() {
  const t = await getTranslations("Metadata");
  return <JsonLd data={siteJsonLd({ url: siteUrl().href, name: t("title"), description: t("description") })} />;
}
