import Form from "next/form";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { CATEGORIES, FACILITIES, STATUSES, getDistricts, type District } from "@/lib/api";
import { panelFilterCount, type ExploreFilters } from "@/lib/filters";
import { buttonClass } from "@/ui/button-styles";
import { Icon } from "@/ui/icon";
import { IconAdjustmentsHorizontal, IconCheck, IconChevronRight, IconSearch } from "@/ui/icons";
import { CATEGORY_ICON, FACILITY_ICON, STATUS_ICON } from "@/ui/place-icons";

// Kotak centang tak terlihat menutupi seluruh chip, supaya sentuhan dan pembaca layar di ponsel mengenai
// kontrolnya sendiri. Cincin fokus dan tanda centang digambar di label.
const CHOICE =
  "relative inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-border-subtle px-4 text-sm font-medium " +
  "transition-colors duration-200 hover:bg-surface-hover has-checked:border-border-focus has-checked:bg-surface-brand-subtle " +
  "has-checked:text-text-brand has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus-ring";

/** Formulir GET untuk pencarian dan filter (FR-02, FR-03). Bekerja tanpa JavaScript; hasilnya tersimpan di URL. */
export async function FilterForm({ filters }: { filters: ExploreFilters }) {
  const [t, tk, tf, ts] = await Promise.all([
    getTranslations("Jelajahi"),
    getTranslations("Kategori"),
    getTranslations("Fasilitas"),
    getTranslations("Status"),
  ]);
  const districts: District[] = await getDistricts().catch(() => []);
  const active = panelFilterCount(filters);
  return (
    <Form action="/jelajahi" role="search" className="flex flex-col gap-4">
      <div className="glass-strong flex items-center gap-2 rounded-full p-1.5 pl-5 has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-focus-ring">
        <label htmlFor="cari-jelajahi" className="sr-only">
          {t("search.label")}
        </label>
        <Icon icon={IconSearch} className="size-5 text-icon-secondary" />
        <input
          id="cari-jelajahi"
          name="q"
          type="search"
          maxLength={80}
          defaultValue={filters.q}
          placeholder={t("search.placeholder")}
          className="min-h-12 min-w-0 flex-1 bg-transparent text-text-primary placeholder:text-text-secondary focus-visible:outline-none"
        />
        <button className={buttonClass("primary", "md")}>{t("search.button")}</button>
      </div>

      {/* min-w-0: fieldset bawaan melebar mengikuti isinya, sehingga chip tidak bisa digulir. */}
      <fieldset className="min-w-0">
        <legend className="sr-only">{t("filters.categories")}</legend>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          {CATEGORIES.map((category) => (
            <Choice key={category} name="category" value={category} checked={filters.category.includes(category)}>
              <Icon icon={CATEGORY_ICON[category]} className="size-4.5" />
              {tk(category)}
            </Choice>
          ))}
        </div>
      </fieldset>

      <details open={active > 0} className="group glass rounded-2xl">
        <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 rounded-2xl px-5 font-semibold [&::-webkit-details-marker]:hidden">
          <Icon icon={IconAdjustmentsHorizontal} />
          {t("filters.toggle")}
          {active > 0 && (
            <span className="rounded-full bg-surface-brand-subtle px-2.5 py-0.5 text-sm text-text-brand">
              {t("filters.active", { count: active })}
            </span>
          )}
          <Icon icon={IconChevronRight} className="ml-auto size-5 transition-transform duration-200 group-open:rotate-90" />
        </summary>
        <div className="grid gap-6 border-t border-border-subtle p-5 lg:grid-cols-3">
          {districts.length > 0 && (
            <div className="flex flex-col gap-2">
              <label htmlFor="kecamatan" className="font-semibold">
                {t("filters.district")}
              </label>
              <select
                id="kecamatan"
                name="district"
                defaultValue={filters.district[0] ?? ""}
                className="min-h-12 rounded-xl border border-border-field bg-surface-field px-4 text-text-primary"
              >
                <option value="">{t("filters.allDistricts")}</option>
                {districts.map((district) => (
                  <option key={district.slug} value={district.slug}>
                    {district.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <fieldset aria-describedby="petunjuk-fasilitas" className="flex min-w-0 flex-col gap-2">
            <legend className="mb-2 font-semibold">{t("filters.facilities")}</legend>
            <div className="flex flex-wrap gap-2">
              {FACILITIES.map((facility) => (
                <Choice key={facility} name="facility" value={facility} checked={filters.facility.includes(facility)}>
                  <Icon icon={FACILITY_ICON[facility]} className="size-4.5" />
                  {tf(facility)}
                </Choice>
              ))}
            </div>
            <p id="petunjuk-fasilitas" className="text-sm text-text-secondary">
              {t("filters.facilitiesHint")}
            </p>
          </fieldset>
          <fieldset className="flex min-w-0 flex-col gap-2">
            <legend className="mb-2 font-semibold">{t("filters.status")}</legend>
            <div className="flex flex-wrap gap-2">
              {STATUSES.map((status) => (
                <Choice key={status} name="status" value={status} checked={filters.status.includes(status)}>
                  <Icon icon={STATUS_ICON[status]} className="size-4.5" />
                  {ts(status)}
                </Choice>
              ))}
            </div>
          </fieldset>
          <div className="flex flex-wrap gap-3 lg:col-span-3">
            <button className={buttonClass("primary", "md")}>{t("filters.apply")}</button>
            <Link href="/jelajahi" className={buttonClass("ghost", "md")}>
              {t("filters.reset")}
            </Link>
          </div>
        </div>
      </details>
    </Form>
  );
}

function Choice({ name, value, checked, children }: { name: string; value: string; checked: boolean; children: ReactNode }) {
  return (
    <label className={`${CHOICE} shrink-0`}>
      <input
        type="checkbox"
        name={name}
        value={value}
        defaultChecked={checked}
        className="peer absolute inset-0 size-full cursor-pointer appearance-none rounded-full opacity-0"
      />
      <Icon icon={IconCheck} className="hidden size-4 peer-checked:block" />
      {children}
    </label>
  );
}
