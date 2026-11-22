"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useTransition, type FormEvent } from "react";
import { CATEGORIES, FACILITIES, STATUSES, type District } from "@/lib/api";
import { mapHref, panelFilterCount, parseFilters, type ExploreFilters } from "@/lib/filters";
import { buttonClass } from "@/ui/button-styles";
import { CHOICE, ChoiceChip } from "@/ui/choice-chip";
import { Icon } from "@/ui/icon";
import { IconAdjustmentsHorizontal, IconSearch, IconX } from "@/ui/icons";
import { CATEGORY_ICON, FACILITY_ICON, STATUS_ICON } from "@/ui/place-icons";

const FILTER_ID = "filter-peta";
// Chip dan kotak pencarian mengambang di atas peta, jadi diberi bayangan supaya terpisah dari tile.
const FLOAT = "shadow-[0_8px_20px_-10px_var(--color-shadow-soft)]";

/**
 * Pencarian dan filter Peta (FR-02, FR-03, FR-05) dengan parameter URL yang sama dengan Jelajahi. Tanpa JavaScript,
 * formulir GET biasa. Dengan JavaScript, chip kategori langsung diterapkan dan hasilnya dimuat lewat navigasi klien,
 * sehingga peta tidak dibuat ulang. Kecamatan, fasilitas, dan status ada di popover Filter.
 */
export function SearchBar({ filters, districts }: { filters: ExploreFilters; districts: District[] }) {
  const t = useTranslations("Jelajahi");
  const tp = useTranslations("Peta.cari");
  const tk = useTranslations("Kategori");
  const tf = useTranslations("Fasilitas");
  const ts = useTranslations("Status");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const form = useRef<HTMLFormElement>(null);
  const popover = useRef<HTMLDivElement>(null);
  const popoverTitle = useRef<HTMLHeadingElement>(null);
  const active = panelFilterCount(filters);
  const href = mapHref(filters);

  // Kolom isian tidak dikendalikan React. Setelah alamat berganti (mis. tombol Kembali), isinya disamakan dengan
  // filter di URL. Teks pencarian yang diubah sejak alamat sebelumnya (masih diketik) tidak ditimpa.
  const previousQuery = useRef(filters.q);
  useEffect(() => {
    const fields = form.current?.elements;
    if (!fields) return;
    for (const field of fields) {
      if (field instanceof HTMLInputElement && field.type === "checkbox") {
        const key = field.name as "category" | "facility" | "status";
        field.checked = (filters[key] as string[]).includes(field.value);
      } else if (field instanceof HTMLInputElement && field.name === "q" && field.value === previousQuery.current) {
        field.value = filters.q;
      } else if (field instanceof HTMLSelectElement) {
        field.value = filters.district[0] ?? "";
      }
    }
    previousQuery.current = filters.q;
  }, [href, filters]);

  function navigate(next: string) {
    if (popover.current?.matches(":popover-open")) popover.current.hidePopover();
    startTransition(() => router.push(next, { scroll: false }));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params: Record<string, string[]> = {};
    for (const [key, value] of new FormData(event.currentTarget)) {
      if (typeof value === "string" && value) (params[key] ??= []).push(value);
    }
    navigate(mapHref(parseFilters(params)));
  }

  return (
    <form ref={form} action="/peta" role="search" aria-busy={pending} onSubmit={submit} className="peta-cari flex min-w-0 flex-col gap-2">
      <div
        className={`relative flex items-center gap-1 rounded-full border-2 border-border-strong bg-surface-raised p-1 has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-focus-ring ${FLOAT}`}
      >
        <button type="submit" aria-label={t("search.button")} className="grid size-11 shrink-0 place-items-center rounded-full text-icon-secondary hover:bg-surface-hover">
          <Icon icon={IconSearch} />
        </button>
        <label htmlFor="cari-peta" className="sr-only">
          {t("search.label")}
        </label>
        <input
          id="cari-peta"
          name="q"
          type="search"
          maxLength={80}
          defaultValue={filters.q}
          placeholder={tp("placeholder")}
          className="min-h-11 min-w-0 flex-1 bg-transparent text-text-primary placeholder:text-text-secondary focus-visible:outline-none"
        />
        <button
          type="button"
          popoverTarget={FILTER_ID}
          className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full px-3.5 text-[0.9375rem] font-bold hover:bg-surface-hover"
        >
          <Icon icon={IconAdjustmentsHorizontal} />
          {t("filters.toggle")}
          {active > 0 && (
            <span className="grid min-w-6 place-items-center rounded-full bg-text-primary px-1.5 text-sm text-bg-canvas">
              <span aria-hidden="true">{active}</span>
              <span className="sr-only">{t("filters.active", { count: active })}</span>
            </span>
          )}
        </button>
        {/* Garis memuat di tepi bawah kotak pencarian selama hasil baru dimuat. */}
        {pending && <span aria-hidden="true" className="peta-memuat absolute inset-x-8 -bottom-0.5 h-1 rounded-full" />}
      </div>
      <p role="status" className="sr-only">
        {pending ? tp("loading") : ""}
      </p>

      {/* Perubahan chip langsung diterapkan; tanpa JavaScript, chip dikirim lewat tombol cari. */}
      <fieldset className="min-w-0" onChange={() => form.current?.requestSubmit()}>
        <legend className="sr-only">{t("filters.categories")}</legend>
        <div className="peta-chip flex gap-2 overflow-x-auto">
          {CATEGORIES.map((category) => (
            <ChoiceChip key={category} name="category" value={category} checked={filters.category.includes(category)} className={FLOAT}>
              <Icon icon={CATEGORY_ICON[category]} className="size-4.5" />
              {tk(category)}
            </ChoiceChip>
          ))}
        </div>
      </fieldset>

      <div
        id={FILTER_ID}
        ref={popover}
        popover="auto"
        role="dialog"
        aria-labelledby="judul-filter-peta"
        onToggle={(event) => event.newState === "open" && popoverTitle.current?.focus()}
        className="peta-filter panel-raised m-0 flex-col overflow-hidden rounded-3xl p-0 text-text-primary open:flex"
      >
        <div className="flex items-center justify-between gap-3 border-b border-border-subtle py-2 pr-2 pl-5">
          <h2 id="judul-filter-peta" ref={popoverTitle} tabIndex={-1} className="font-heading text-lg font-bold">
            {tp("filterTitle")}
          </h2>
          <button type="button" popoverTarget={FILTER_ID} popoverTargetAction="hide" aria-label={tp("close")} className="grid size-11 place-items-center rounded-full hover:bg-surface-hover">
            <Icon icon={IconX} />
          </button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-5">
          {districts.length > 0 && (
            <div className="flex flex-col gap-2">
              <label htmlFor="kecamatan-peta" className="font-semibold">
                {t("filters.district")}
              </label>
              <select
                id="kecamatan-peta"
                name="district"
                defaultValue={filters.district[0] ?? ""}
                className="min-h-12 rounded-2xl border border-border-field bg-surface-field px-4 text-text-primary"
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
          <fieldset aria-describedby="petunjuk-fasilitas-peta" className="flex min-w-0 flex-col gap-2">
            <legend className="mb-2 font-semibold">{t("filters.facilities")}</legend>
            <div className="flex flex-wrap gap-2">
              {FACILITIES.map((facility) => (
                <ChoiceChip key={facility} name="facility" value={facility} checked={filters.facility.includes(facility)}>
                  <Icon icon={FACILITY_ICON[facility]} className="size-4.5" />
                  {tf(facility)}
                </ChoiceChip>
              ))}
            </div>
            <p id="petunjuk-fasilitas-peta" className="text-sm text-text-secondary">
              {t("filters.facilitiesHint")}
            </p>
          </fieldset>
          <fieldset className="flex min-w-0 flex-col gap-2">
            <legend className="mb-2 font-semibold">{t("filters.status")}</legend>
            <div className="flex flex-wrap gap-2">
              {STATUSES.map((status) => (
                <ChoiceChip key={status} name="status" value={status} checked={filters.status.includes(status)}>
                  <Icon icon={STATUS_ICON[status]} className="size-4.5" />
                  {ts(status)}
                </ChoiceChip>
              ))}
            </div>
          </fieldset>
        </div>
        <div className="flex flex-wrap gap-3 border-t border-border-subtle p-4">
          <button className={buttonClass("primary", "md", "flex-1")}>{t("filters.apply")}</button>
          <Link
            href="/peta"
            onClick={(event) => {
              event.preventDefault();
              navigate("/peta");
            }}
            className={buttonClass("outline", "md", "flex-1")}
          >
            {t("filters.reset")}
          </Link>
        </div>
      </div>
    </form>
  );
}

/**
 * Pengganti pencarian selama isi Peta dimuat: bentuk, kelas, dan isi yang sama dengan SearchBar (kotak pencarian dan
 * chip kategori), tanpa kontrol yang bisa dipakai. Karena tata letaknya sama, tingginya sama di setiap lebar dan tinggi
 * layar, jadi panel dan kontrol tidak bergeser saat pencarian asli menggantikannya.
 */
export function SearchBarPlaceholder() {
  const t = useTranslations("Jelajahi");
  const tp = useTranslations("Peta.cari");
  const tk = useTranslations("Kategori");
  return (
    <div aria-hidden="true" className="peta-cari flex min-w-0 flex-col gap-2">
      <div className={`relative flex items-center gap-1 rounded-full border-2 border-border-strong bg-surface-raised p-1 ${FLOAT}`}>
        <span className="grid size-11 shrink-0 place-items-center text-icon-secondary">
          <Icon icon={IconSearch} />
        </span>
        <span className="flex min-h-11 min-w-0 flex-1 items-center truncate text-text-secondary">{tp("placeholder")}</span>
        <span className="inline-flex min-h-11 shrink-0 items-center gap-2 px-3.5 text-[0.9375rem] font-bold">
          <Icon icon={IconAdjustmentsHorizontal} />
          {t("filters.toggle")}
        </span>
      </div>
      <div className="min-w-0">
        <div className="peta-chip flex gap-2 overflow-x-hidden">
          {CATEGORIES.map((category) => (
            <span key={category} className={`${CHOICE} ${FLOAT}`}>
              <Icon icon={CATEGORY_ICON[category]} className="size-4.5" />
              {tk(category)}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
