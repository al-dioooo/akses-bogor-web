"use client";

import { useTranslations } from "next-intl";
import { TextField } from "@/components/laporkan/form-parts";
import { LocationPicker } from "@/components/laporkan/location-picker";
import { PickerMap } from "@/components/laporkan/picker-map";
import { CATEGORIES } from "@/lib/api";
import type { Review } from "@/lib/verifikasi";
import { fieldClass } from "@/ui/field-styles";
import { Icon } from "@/ui/icon";
import { CATEGORY_ICON } from "@/ui/place-icons";
import { DECISION_LIMITS, type Decision } from "./decision";

const TILE =
  "relative flex min-h-12 cursor-pointer items-center gap-2.5 rounded-2xl border-2 border-border-subtle bg-surface-raised px-3.5 font-semibold " +
  "transition-colors hover:border-border-strong has-checked:border-border-strong has-checked:bg-text-primary has-checked:text-bg-canvas " +
  "has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus-ring";

type Props = { review: Review; decision: Decision; update: (change: Partial<Decision>) => void };

/**
 * Nama, kategori, patokan, dan pin yang akan tayang untuk laporan baru dan Edit lokasi (ADR-0036). Pin memakai pemilih
 * lokasi Laporkan, jadi kecamatan dan cakupan Kota Bogor dicek ulang sebelum dipakai. Laporan kekurangan tidak
 * mengubah bagian ini.
 */
export function PlaceEdit({ review, decision, update }: Props) {
  const t = useTranslations("Pemeriksaan.edit");
  const tk = useTranslations("Kategori");
  return (
    <div className="flex flex-col gap-5 rounded-3xl border-2 border-border-strong p-4 sm:p-6">
      <div className="flex flex-col gap-1">
        <h3 className="font-heading text-xl font-bold">{t("title")}</h3>
        <p className="text-text-secondary">{t("intro")}</p>
      </div>
      <TextField id="keputusan-nama" label={t("name")} value={decision.name} max={DECISION_LIMITS.name} onValue={(name) => update({ name })} autoComplete="off" />
      <fieldset className="flex min-w-0 flex-col gap-2">
        <legend className="mb-2 font-semibold">{t("category")}</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {CATEGORIES.map((category) => (
            <label key={category} className={TILE}>
              <input type="radio" name="keputusan-kategori" checked={decision.category === category} onChange={() => update({ category })} className="absolute inset-0 z-10 cursor-pointer opacity-0" />
              <Icon icon={CATEGORY_ICON[category]} className="size-5" />
              {tk(category)}
            </label>
          ))}
        </div>
      </fieldset>
      <TextField
        id="keputusan-patokan"
        label={t("landmark")}
        hint={t("landmarkHint")}
        value={decision.landmark}
        max={DECISION_LIMITS.landmark}
        onValue={(landmark) => update({ landmark })}
        autoComplete="off"
      />
      <LocationPicker
        confirmed={decision.location}
        name={decision.name}
        placeId={review.place?.id ?? null}
        onConfirm={(location) => update({ location })}
        onNearbyPending={() => undefined}
        map={(candidate, move) => <PickerMap candidate={candidate} onMove={move} />}
      />
    </div>
  );
}

/** Deskripsi yang tayang, untuk semua jenis laporan (ADR-0036). */
export function DescriptionEdit({ value, onValue }: { value: string; onValue: (value: string) => void }) {
  const t = useTranslations("Pemeriksaan.edit");
  const tl = useTranslations("Laporkan");
  const over = value.length > DECISION_LIMITS.description;
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="keputusan-deskripsi" className="font-semibold">
        {t("description")}
      </label>
      <p id="keputusan-deskripsi-petunjuk" className="text-text-secondary">
        {t("descriptionHint")}
      </p>
      <textarea
        id="keputusan-deskripsi"
        rows={5}
        value={value}
        onChange={(event) => onValue(event.target.value)}
        aria-invalid={over ? true : undefined}
        aria-describedby="keputusan-deskripsi-petunjuk keputusan-deskripsi-hitung"
        className={fieldClass(over, "py-3")}
      />
      <p id="keputusan-deskripsi-hitung" className={`text-sm ${over ? "font-semibold text-text-error" : "text-text-secondary"}`}>
        {tl("counter", { count: value.length, max: DECISION_LIMITS.description })}
      </p>
    </div>
  );
}
