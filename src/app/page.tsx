import { Hero } from "@/components/beranda/hero";
import { RoadStats } from "@/components/beranda/road-stats";
import { Route } from "@/components/beranda/route";
import { Statuses } from "@/components/beranda/statuses";
import { Steps } from "@/components/beranda/steps";

/** Beranda (ADR-0027): hero "Halte ke pintu", pita angka, rute empat fasilitas, arti status, dan alur data. */
export default function Beranda() {
  return (
    <main id="konten" className="flex flex-1 flex-col">
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
