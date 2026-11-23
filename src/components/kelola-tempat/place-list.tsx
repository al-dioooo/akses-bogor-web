import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { CATEGORIES, STATUSES, type District } from "@/lib/api";
import type { AdminPlaceItem } from "@/lib/kelola-tempat";
import { buttonClass } from "@/ui/button-styles";
import { Icon } from "@/ui/icon";
import { IconArrowLeft, IconArrowRight, IconCircleCheck, IconEyeOff, IconSearch, IconShieldCheck, IconUser } from "@/ui/icons";
import { StatusBadge } from "@/ui/status-badge";
import { listHref, type ListFilters } from "./query";

const select = "min-h-12 w-full rounded-2xl border-2 border-border-field bg-surface-field px-4 text-text-primary";

/** Saringan daftar sebagai formulir GET biasa: bisa dipakai tanpa JavaScript, dan hasilnya ada di alamat halaman. */
export async function PlaceFilters({ filters, districts, active }: { filters: ListFilters; districts: District[]; active: boolean }) {
  const [t, tk, ts] = await Promise.all([getTranslations("KelolaTempat.filters"), getTranslations("Kategori"), getTranslations("Status")]);
  const choices: { name: string; label: string; all: string; value?: string; options: { value: string; label: string }[] }[] = [
    { name: "kategori", label: t("category"), all: t("allCategories"), value: filters.category, options: CATEGORIES.map((c) => ({ value: c, label: tk(c) })) },
    { name: "kecamatan", label: t("district"), all: t("allDistricts"), value: filters.district, options: districts.map((d) => ({ value: d.slug, label: d.name })) },
    { name: "status", label: t("status"), all: t("allStatuses"), value: filters.status, options: STATUSES.map((s) => ({ value: s, label: ts(s) })) },
    { name: "asal", label: t("origin"), all: t("allOrigins"), value: filters.origin, options: [{ value: "tim", label: t("originTim") }, { value: "admin", label: t("originAdmin") }] },
    { name: "tayang", label: t("published"), all: t("allPublished"), value: filters.published, options: [{ value: "ya", label: t("publishedYa") }, { value: "tidak", label: t("publishedTidak") }] },
  ];
  return (
    <form method="get" action="/verifikasi/tempat" role="search" aria-label={t("label")} className="panel flex flex-col gap-4 rounded-3xl p-4 sm:p-5">
      <div className="flex flex-col gap-2">
        <label htmlFor="cari-tempat" className="font-semibold">
          {t("search")}
        </label>
        <input id="cari-tempat" name="q" type="search" defaultValue={filters.q ?? ""} maxLength={80} className={select} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {choices.map((choice) => (
          <div key={choice.name} className="flex min-w-0 flex-col gap-2">
            <label htmlFor={`saring-${choice.name}`} className="font-semibold">
              {choice.label}
            </label>
            <select id={`saring-${choice.name}`} name={choice.name} defaultValue={choice.value ?? ""} className={select}>
              <option value="">{choice.all}</option>
              {choice.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button className={buttonClass("ink", "sm")}>
          <Icon icon={IconSearch} />
          {t("apply")}
        </button>
        {active && (
          <Link href="/verifikasi/tempat" className="inline-flex min-h-11 items-center font-semibold text-text-brand underline underline-offset-4">
            {t("reset")}
          </Link>
        )}
      </div>
    </form>
  );
}

/** Satu baris per tempat. Status, asal, dan keadaan tayang selalu teks dengan ikon, tidak hanya warna. */
export async function PlaceRows({ items }: { items: AdminPlaceItem[] }) {
  const [t, tk, format] = await Promise.all([getTranslations("KelolaTempat"), getTranslations("Kategori"), getFormatter()]);
  const chip = "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold";
  return (
    <ul className="flex flex-col gap-2">
      {items.map((place) => (
        <li key={place.id} className="panel flex flex-col gap-3 rounded-2xl p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-0.5">
              <h3 className="font-heading text-lg font-bold break-words">
                <Link href={`/verifikasi/tempat/${place.id}`} className="underline-offset-4 hover:underline">
                  {place.name}
                </Link>
              </h3>
              <p className="text-sm text-text-secondary">
                {tk(place.category)} · {place.district.name} · {t("updated", { date: format.dateTime(new Date(place.updatedAt), { dateStyle: "medium" }) })}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusBadge status={place.status} size="sm" />
              <span className={`${chip} ${place.verifiedBy === "admin" ? "bg-surface-brand-subtle text-text-brand" : "bg-bg-sunken text-text-primary"}`}>
                <Icon icon={place.verifiedBy === "admin" ? IconUser : IconShieldCheck} className="size-4" />
                {t(`origin.${place.verifiedBy}`)}
              </span>
              <span className={`${chip} ${place.published ? "bg-status-accessible-bg text-status-accessible-fg" : "bg-status-inaccessible-bg text-status-inaccessible-fg"}`}>
                <Icon icon={place.published ? IconCircleCheck : IconEyeOff} className="size-4" />
                {t(place.published ? "published.ya" : "published.tidak")}
              </span>
            </div>
          </div>
          {!place.published && place.unpublishedReason && <p className="rounded-xl bg-bg-sunken px-3 py-2 text-sm">{t("unpublishedReason", { reason: place.unpublishedReason })}</p>}
        </li>
      ))}
    </ul>
  );
}

/** Halaman sebelumnya dan berikutnya, dengan halaman ke berapa sebagai teks. */
export async function Pager({ filters, page, pages }: { filters: ListFilters; page: number; pages: number }) {
  if (pages <= 1) return null;
  const t = await getTranslations("KelolaTempat.pager");
  return (
    <nav aria-label={t("label")} className="flex flex-wrap items-center justify-between gap-3">
      {page > 1 ? (
        <Link href={listHref(filters, page - 1)} className={buttonClass("outline", "sm")}>
          <Icon icon={IconArrowLeft} />
          {t("previous")}
        </Link>
      ) : (
        <span />
      )}
      <p className="text-text-secondary">{t("page", { page, pages })}</p>
      {page < pages ? (
        <Link href={listHref(filters, page + 1)} className={buttonClass("outline", "sm")}>
          {t("next")}
          <Icon icon={IconArrowRight} />
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
