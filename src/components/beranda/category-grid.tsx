import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { CATEGORIES, getStats, type Category } from "@/lib/api";
import { Icon } from "@/ui/icon";
import { IconArrowUpRight } from "@/ui/icons";
import { CATEGORY_ICON } from "@/ui/place-icons";
import { SectionHeading } from "@/ui/section-heading";

/** Empat Category tile ke Jelajahi dengan filter kategori, berisi jumlah lokasi terverifikasi (FR-01). */
export async function CategoryGrid() {
  const t = await getTranslations("Beranda.categories");
  return (
    <section aria-labelledby="judul-kategori" className="page-width flex flex-col gap-8">
      <SectionHeading id="judul-kategori" eyebrow={t("eyebrow")} title={t("title")} />
      <Suspense fallback={<Tiles counts={null} />}>
        <TilesWithCounts />
      </Suspense>
    </section>
  );
}

async function TilesWithCounts() {
  // Bila API tidak bisa dihubungi, kategori tetap bisa dibuka; galatnya sudah tampil di statistik.
  const stats = await getStats().catch(() => null);
  return <Tiles counts={stats?.byCategory ?? null} />;
}

async function Tiles({ counts }: { counts: Record<Category, number> | null }) {
  const [t, tk] = await Promise.all([getTranslations("Beranda.categories"), getTranslations("Kategori")]);
  return (
    <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {CATEGORIES.map((category) => (
        <li key={category} className="reveal">
          <Link
            href={`/jelajahi?category=${category}`}
            className="group panel card-lift relative flex h-full flex-col gap-6 rounded-2xl p-5 sm:p-6"
          >
            <span className="grid size-12 -rotate-6 place-items-center rounded-lg bg-surface-brand-subtle text-icon-brand transition-transform duration-300 ease-out-expo group-hover:rotate-0">
              <Icon icon={CATEGORY_ICON[category]} className="size-6" />
            </span>
            <span className="flex flex-col gap-0.5">
              <span className="font-heading text-lg font-bold tracking-[-0.02em]">{tk(category)}</span>
              <span className="min-h-5 text-sm text-text-secondary">
                {counts ? t("count", { count: counts[category] }) : null}
              </span>
            </span>
            <Icon
              icon={IconArrowUpRight}
              className="absolute top-5 right-5 size-5 text-icon-secondary transition-transform duration-300 ease-out-expo group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            />
          </Link>
        </li>
      ))}
    </ul>
  );
}
