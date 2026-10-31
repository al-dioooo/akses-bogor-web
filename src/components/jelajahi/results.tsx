import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getPlaces } from "@/lib/api";
import { PAGE_SIZE, exploreHref, hasFilters, type ExploreFilters } from "@/lib/filters";
import { buttonClass } from "@/ui/button-styles";
import { Icon } from "@/ui/icon";
import { IconArrowLeft, IconArrowRight, IconSearch } from "@/ui/icons";
import { LocationCard } from "../location-card";

/** Daftar Location card dengan jumlah hasil yang sesuai data yang tampil (FR-04). */
export async function Results({ filters }: { filters: ExploreFilters }) {
  const t = await getTranslations("Jelajahi");
  const { total, items } = await getPlaces({
    q: filters.q || undefined,
    category: filters.category,
    district: filters.district,
    facility: filters.facility,
    status: filters.status,
    limit: PAGE_SIZE,
    offset: (filters.page - 1) * PAGE_SIZE,
  });
  const from = (filters.page - 1) * PAGE_SIZE + 1;
  const pages = Math.ceil(total / PAGE_SIZE);

  return (
    <section aria-labelledby="jumlah-hasil" className="flex flex-col gap-5">
      {/* Diumumkan pembaca layar setiap kali filter diterapkan. */}
      <p id="jumlah-hasil" role="status" className="font-semibold">
        {t("results.count", { total: items.length ? total : 0, from, to: from + items.length - 1 })}
      </p>
      {items.length > 0 ? (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((place) => (
            <li key={place.id} className="reveal">
              <LocationCard place={place} />
            </li>
          ))}
        </ul>
      ) : (
        <Empty filtered={hasFilters(filters)} />
      )}
      {pages > 1 && (
        <nav aria-label={t("pagination.label")} className="flex flex-wrap items-center justify-between gap-3">
          {filters.page > 1 ? (
            <Link href={exploreHref(filters, filters.page - 1)} className={buttonClass("outline", "md")}>
              <Icon icon={IconArrowLeft} />
              {t("pagination.previous")}
            </Link>
          ) : (
            <span />
          )}
          <p className="text-sm text-text-secondary">{t("pagination.page", { page: filters.page, pages })}</p>
          {filters.page < pages ? (
            <Link href={exploreHref(filters, filters.page + 1)} className={buttonClass("outline", "md")}>
              {t("pagination.next")}
              <Icon icon={IconArrowRight} />
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </section>
  );
}

/** "Tidak ada hasil" dibedakan dari "belum ada data", dan selalu menawarkan langkah berikutnya. */
async function Empty({ filtered }: { filtered: boolean }) {
  const t = await getTranslations("Jelajahi");
  return (
    <div className="flex flex-col items-start gap-4 rounded-2xl border-2 border-dashed border-border-subtle p-8">
      <span className="grid size-12 place-items-center rounded-lg bg-surface-brand-subtle text-icon-brand">
        <Icon icon={IconSearch} className="size-6" />
      </span>
      <div>
        <h2 className="font-heading text-lg font-bold">{t(filtered ? "results.emptyTitle" : "results.noDataTitle")}</h2>
        <p className="text-text-secondary">{t(filtered ? "results.emptyBody" : "results.noDataBody")}</p>
      </div>
      {filtered && (
        <Link href="/jelajahi" className={buttonClass("outline", "sm")}>
          {t("filters.reset")}
        </Link>
      )}
    </div>
  );
}

export function ResultsSkeleton({ label }: { label: string }) {
  return (
    <div role="status" className="flex flex-col gap-5">
      <span className="sr-only">{label}</span>
      <span aria-hidden="true" className="h-6 w-56 rounded-sm bg-surface-brand-subtle" />
      <div aria-hidden="true" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((key) => (
          <div key={key} className="panel h-80 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
