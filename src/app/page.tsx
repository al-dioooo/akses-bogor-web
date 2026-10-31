import { Guide } from "@/components/beranda/guide";
import { Hero } from "@/components/beranda/hero";
import { RoadStats } from "@/components/beranda/road-stats";
import { Steps } from "@/components/beranda/steps";

/** Beranda (ADR-0027): hero "Halte ke pintu", pita angka, lalu edukasi dan ajakan melapor. */
export default function Beranda() {
  return (
    <main id="konten" className="flex flex-1 flex-col">
      <Hero />
      <RoadStats />
      <div className="flex flex-col gap-(--spacing-4xl) pt-(--spacing-4xl)">
        <Guide />
        <Steps />
      </div>
    </main>
  );
}
