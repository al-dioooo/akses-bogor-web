"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Icon } from "@/ui/icon";
import { IconAccessible, IconBuildingHospital, IconBuildingMosque, IconBusStop, IconMap2, IconMapPin, IconPencil, IconShieldCheck, type Glyph } from "@/ui/icons";
import { AgenMark } from "./agen-bar";

type Key = "place" | "hospital" | "mosque" | "halte" | "rule" | "priority" | "toMap";
type Suggestion = { key: Key; text: string; icon: Glyph };

type Props = {
  /** Akun yang sudah lengkap selama agen kontributor dibuka: saran dan pengantar untuk memetakan. */
  contributor: boolean;
  /** Tempat dari "Tanya rute ke sini" (`?tempat=`). */
  place?: { name: string };
  onPick: (question: string) => void;
};

/**
 * Keadaan kosong Agen AI (ADR-0054): pengantar, pemberitahuan privasi sebelum pertanyaan pertama, dan empat saran
 * pertanyaan yang langsung terkirim saat dipilih.
 */
export function EmptyState({ contributor, place, onPick }: Props) {
  const t = useTranslations("Agen.kosong");
  const s = (key: Key, icon: Glyph, values?: Record<string, string>): Suggestion => ({ key, icon, text: t(`saran.${key}`, values) });
  const suggestions = [
    ...(place ? [s("place", IconMapPin, { name: place.name })] : []),
    ...(contributor ? [s("priority", IconMap2), s("toMap", IconPencil)] : []),
    s("hospital", IconBuildingHospital),
    s("mosque", IconBuildingMosque),
    s("halte", IconBusStop),
    s("rule", IconAccessible),
  ].slice(0, 4);

  return (
    <section aria-labelledby="agen-kosong-judul" className="flex flex-1 flex-col justify-end gap-3 sm:justify-center sm:gap-6">
      <div className="flex flex-col items-start gap-3 sm:gap-4">
        <AgenMark className="size-14 rounded-2xl max-sm:hidden" />
        <h2 id="agen-kosong-judul" className="display text-[clamp(1.875rem,1.2rem+2.6vw,3.25rem)] leading-none">
          {t("title")}
          <span className="accent"> {t("accent")}</span>
        </h2>
        <p className="max-w-2xl text-text-secondary sm:text-lg">
          {t("intro")}
          {contributor && ` ${t("introContributor")}`}
        </p>
      </div>
      <div role="group" aria-labelledby="agen-saran-judul" className="flex flex-col gap-3">
        <p id="agen-saran-judul" className="lbl">
          {t("suggestions")}
        </p>
        <ul className="grid gap-1.5 sm:grid-cols-2 sm:gap-2">
          {/* Di ponsel hanya tiga saran, supaya pengantar, saran, dan pemberitahuan muat di atas kotak tulis. */}
          {suggestions.map((suggestion, index) => (
            <li key={suggestion.key} className={`flex ${index === 3 ? "max-sm:hidden" : ""}`}>
              <button
                type="button"
                onClick={() => onPick(suggestion.text)}
                className="card-lift flex min-h-12 w-full items-center gap-3 rounded-2xl border-2 border-border-subtle bg-surface-raised px-3 py-2 text-left font-semibold transition-colors duration-200 hover:border-border-strong max-sm:text-[0.9375rem] sm:min-h-14 sm:py-3"
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-surface-brand-subtle text-icon-brand sm:size-9">
                  <Icon icon={suggestion.icon} />
                </span>
                {suggestion.text}
              </button>
            </li>
          ))}
        </ul>
      </div>
      {/* Pemberitahuan privasi tepat di atas kotak tulis, sebelum pertanyaan pertama (ADR-0050, ADR-0054). */}
      <p className="flex max-w-2xl gap-3 rounded-2xl bg-bg-sunken p-4 text-sm">
        <Icon icon={IconShieldCheck} className="mt-0.5 size-5 shrink-0 text-icon-brand" />
        <span>
          {t.rich("notice", {
            link: (chunks) => (
              <Link href="/kebijakan-privasi" className="font-semibold text-text-brand underline underline-offset-2">
                {chunks}
              </Link>
            ),
          })}
        </span>
      </p>
    </section>
  );
}
