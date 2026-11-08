"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { FieldError } from "@/components/akun/form-parts";
import { CATEGORIES } from "@/lib/api";
import { LIMITS, type FieldError as StepError, type ReportDraft } from "@/lib/isian-laporan";
import { buttonClass } from "@/ui/button-styles";
import { Icon } from "@/ui/icon";
import { IconPencil } from "@/ui/icons";
import { CATEGORY_ICON } from "@/ui/place-icons";
import { errorFor, TextField } from "./form-parts";
import { LocationPicker, type Candidate } from "./location-picker";
import type { ReactNode } from "react";

// Pilihan kategori berupa Radio tile (Frame DS v1): radio asli menutupi seluruh tile supaya sentuhan dan pembaca layar
// mengenai kontrolnya sendiri; cincin fokus dan tanda pilihan digambar di tile.
const TILE =
  "relative flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border-2 border-border-subtle bg-surface-raised px-4 font-semibold " +
  "transition-colors duration-200 hover:border-border-strong has-checked:border-border-strong has-checked:bg-text-primary has-checked:text-bg-canvas " +
  "has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus-ring";

type Props = {
  draft: ReportDraft;
  errors: StepError[];
  update: (change: Partial<ReportDraft>) => void;
  onNearbyPending: (pending: boolean) => void;
  map?: (candidate: Candidate | null, move: (candidate: Candidate) => void) => ReactNode;
};

/** Langkah 1 (FR-21): nama, satu kategori, lokasi, dan patokan opsional. Laporan kekurangan hanya menampilkannya. */
export function StepInfo({ draft, errors, update, onNearbyPending, map }: Props) {
  const t = useTranslations("Laporkan.info");
  const te = useTranslations("Laporkan.errors");
  const tk = useTranslations("Kategori");

  if (draft.kind === "kekurangan") {
    return (
      <section aria-labelledby="tempat-tetap" className="flex flex-col items-start gap-3 rounded-3xl bg-bg-sunken p-5">
        <h3 id="tempat-tetap" className="font-heading text-lg font-bold">
          {t("fixedTitle")}
        </h3>
        <p className="text-lg">
          <strong>{draft.name}</strong>
          <br />
          {draft.category && tk(draft.category)} · {draft.location?.district.name}
        </p>
        <p className="text-text-secondary">{t("fixedBody")}</p>
        <Link href={`/laporkan?lokasi=${draft.placeId}`} className={buttonClass("outline", "sm", "py-2 text-left").replace("whitespace-nowrap ", "")}>
          <Icon icon={IconPencil} />
          {t("fixedEdit", { name: draft.name })}
        </Link>
      </section>
    );
  }

  const categoryError = errorFor(errors, "kategori");
  const locationError = errorFor(errors, "lokasi");
  return (
    <div className="flex flex-col gap-6">
      <TextField
        id="nama"
        label={t("nameLabel")}
        hint={t("nameHint")}
        value={draft.name}
        max={LIMITS.name}
        error={errorFor(errors, "nama")}
        onValue={(name) => update({ name })}
        aria-required="true"
        autoComplete="off"
      />

      <fieldset
        id="kategori"
        tabIndex={-1}
        aria-describedby={categoryError ? "kategori-petunjuk kategori-galat" : "kategori-petunjuk"}
        className="flex min-w-0 flex-col gap-3"
      >
        <legend className="mb-1 font-semibold">{t("categoryLegend")}</legend>
        <p id="kategori-petunjuk" className="text-text-secondary">
          {t("categoryHint")}
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {CATEGORIES.map((category) => (
            <label key={category} className={TILE}>
              <input
                type="radio"
                name="kategori"
                value={category}
                checked={draft.category === category}
                onChange={() => update({ category })}
                className="absolute inset-0 cursor-pointer opacity-0"
              />
              <Icon icon={CATEGORY_ICON[category]} className="size-6" />
              {tk(category)}
            </label>
          ))}
        </div>
        <FieldError id="kategori-galat" message={categoryError ? te(categoryError.message) : undefined} />
      </fieldset>

      <LocationPicker
        confirmed={draft.location}
        name={draft.name}
        placeId={draft.placeId}
        error={locationError ? te(locationError.message) : undefined}
        onConfirm={(location) => update({ location })}
        onNearbyPending={onNearbyPending}
        map={map}
      />

      <TextField
        id="patokan"
        label={t("landmarkLabel")}
        hint={t("landmarkHint")}
        value={draft.landmark}
        max={LIMITS.landmark}
        error={errorFor(errors, "patokan")}
        onValue={(landmark) => update({ landmark })}
        autoComplete="off"
      />
    </div>
  );
}
