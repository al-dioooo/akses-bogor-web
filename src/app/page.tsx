import { CategoryGrid } from "@/components/beranda/category-grid";
import { Guide } from "@/components/beranda/guide";
import { Hero } from "@/components/beranda/hero";
import { Steps } from "@/components/beranda/steps";

/** Beranda (Landing · DS v1): pencarian, statistik dari data, kategori, edukasi, dan ajakan melapor. */
export default function Beranda() {
  return (
    <main id="konten" className="flex flex-1 flex-col gap-(--spacing-4xl)">
      <Hero />
      <CategoryGrid />
      <Guide />
      <Steps />
    </main>
  );
}
