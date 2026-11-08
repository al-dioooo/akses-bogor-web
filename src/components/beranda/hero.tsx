import Form from "next/form";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { CATEGORIES, getStats, type Category } from "@/lib/api";
import { buttonClass } from "@/ui/button-styles";
import { Icon } from "@/ui/icon";
import { IconSearch } from "@/ui/icons";
import { CATEGORY_ICON } from "@/ui/place-icons";
import { HeroScene } from "./hero-scene";

/** Hero Beranda (ADR-0027): judul, pencarian, dan kategori di atas ilustrasi "Halte ke pintu". */
export async function Hero() {
  const t = await getTranslations("Beranda");
  return (
    <section aria-labelledby="judul-beranda" className="relative isolate flex flex-col overflow-hidden lg:min-h-[calc(50vw+7.5rem)]">
      <div className="page-width relative z-10 pt-6 lg:pt-[clamp(1rem,4vh,3rem)]">
        <div className="flex max-w-[33rem] flex-col items-start">
          <p className="lbl">{t("eyebrow")}</p>
          <h1 id="judul-beranda" className="display mt-4 text-[clamp(2.75rem,1.4rem+3.9vw,5.2rem)] leading-[0.95] text-pretty">
            {t("titleLead")} <span className="accent">{t("titleAccent")}</span>
          </h1>
          <p className="mt-5 max-w-[30rem] text-lg leading-relaxed text-text-secondary">{t("intro")}</p>
          <Form
            action="/jelajahi"
            role="search"
            className="mt-7 flex w-full max-w-[30rem] items-center gap-2 rounded-full border-2 border-border-strong bg-surface-raised p-1.5 pl-5 shadow-[0_18px_40px_-24px_var(--color-shadow-soft)] has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-focus-ring"
          >
            <label htmlFor="cari-beranda" className="sr-only">
              {t("search.label")}
            </label>
            <Icon icon={IconSearch} className="size-5 text-icon-secondary" />
            {/* Cincin fokus digambar di seluruh kolom pencarian, bukan di input saja. */}
            <input
              id="cari-beranda"
              name="q"
              type="search"
              maxLength={80}
              placeholder={t("search.placeholder")}
              className="min-h-11 min-w-0 flex-1 bg-transparent text-base text-text-primary placeholder:text-text-secondary focus-visible:outline-none"
            />
            <button className={buttonClass("ink", "sm")}>{t("search.button")}</button>
          </Form>
          <Suspense fallback={<Categories counts={null} />}>
            <CategoriesWithCounts />
          </Suspense>
        </div>
      </div>
      <HeroScene />
    </section>
  );
}

async function CategoriesWithCounts() {
  // Bila API tidak bisa dihubungi, kategori tetap bisa dibuka; galatnya tampil di pita angka.
  const stats = await getStats().catch(() => null);
  return <Categories counts={stats?.byCategory ?? null} />;
}

/** Pintasan ke Jelajahi dengan filter kategori, berisi jumlah lokasi terverifikasi (FR-01). */
async function Categories({ counts }: { counts: Record<Category, number> | null }) {
  const [t, tk] = await Promise.all([getTranslations("Beranda.categories"), getTranslations("Kategori")]);
  return (
    <ul aria-label={t("label")} className="mt-4 flex flex-wrap gap-2">
      {CATEGORIES.map((category) => (
        <li key={category}>
          <Link
            href={`/jelajahi?category=${category}`}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border-subtle bg-surface-raised px-3.5 text-sm font-semibold transition-colors duration-200 hover:border-border-strong"
          >
            <Icon icon={CATEGORY_ICON[category]} className="size-4.5 text-icon-brand" />
            {tk(category)}
            {counts && <span className="font-mono text-xs font-medium text-text-secondary">{t("count", { count: counts[category] })}</span>}
          </Link>
        </li>
      ))}
    </ul>
  );
}
