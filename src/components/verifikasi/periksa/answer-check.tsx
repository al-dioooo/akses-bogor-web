"use client";

import { useTranslations } from "next-intl";
import { TextField } from "@/components/laporkan/form-parts";
import type { Facility } from "@/lib/api";
import { ANSWERS, REASONS } from "@/lib/isian-laporan";
import type { Evidence } from "@/lib/verifikasi";
import { Icon } from "@/ui/icon";
import { ANSWER_ICON } from "@/ui/place-icons";
import { DECISION_LIMITS, finalAnswer, type FacilityDecision } from "./decision";
import { AnswerChip } from "./parts";

// Radio asli menutupi seluruh pilihan; cincin fokus dan tanda pilihan digambar di label (sama dengan langkah 2 Laporkan).
const TILE =
  "relative flex min-h-12 cursor-pointer items-center gap-2.5 rounded-2xl border-2 border-border-subtle bg-surface-raised px-3.5 py-2 font-semibold " +
  "transition-colors hover:border-border-strong has-checked:border-border-strong has-checked:bg-text-primary has-checked:text-bg-canvas " +
  "has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus-ring";
const RADIO = "absolute inset-0 z-10 cursor-pointer opacity-0";
const EVIDENCE: Evidence[] = ["terbukti", "tanpa_bukti"];

/**
 * Kontrol keputusan satu fasilitas (FR-33): tandai Terbukti atau Tanpa bukti, lalu pastikan jawaban, alasan, dan
 * catatan yang tayang. Semua pilihan adalah radio asli dalam fieldset berlabel nama fasilitas, jadi bisa dipakai dengan
 * keyboard dan pembaca layar.
 */
export function AnswerCheck({ facility, value, onChange }: { facility: Facility; value: FacilityDecision; onChange: (next: FacilityDecision) => void }) {
  const t = useTranslations("Pemeriksaan.check");
  const tf = useTranslations("Fasilitas");
  const tj = useTranslations("Jawaban");
  const ta = useTranslations("Alasan");
  const name = tf(facility);
  const set = (change: Partial<FacilityDecision>) => {
    const next = { ...value, ...change };
    if (next.answer !== "tidak_tersedia") next.reason = null;
    onChange(next);
  };
  const shown = finalAnswer(facility, value);

  return (
    <div className="flex flex-col gap-4 border-t-2 border-dashed border-border-subtle pt-4">
      <fieldset className="flex min-w-0 flex-col gap-2">
        <legend className="mb-2 font-semibold">{t("evidenceLegend", { facility: name })}</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {EVIDENCE.map((evidence) => (
            <label key={evidence} className={`${TILE} flex-col items-start gap-0.5`}>
              <input
                id={`bukti-${facility}-${evidence}`}
                type="radio"
                name={`bukti-${facility}`}
                checked={value.evidence === evidence}
                onChange={() => set({ evidence })}
                className={RADIO}
              />
              <span>{t(`evidence.${evidence}`)}</span>
              <span className="text-sm font-normal opacity-80">{t(`evidenceHint.${evidence}`)}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {value.evidence === "terbukti" && (
        <>
          <fieldset className="flex min-w-0 flex-col gap-2">
            <legend className="mb-2 font-semibold">{t("answerLegend", { facility: name })}</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {ANSWERS.map((answer) => (
                <label key={answer} className={TILE}>
                  <input type="radio" name={`jawaban-${facility}`} checked={value.answer === answer} onChange={() => set({ answer })} className={RADIO} />
                  <Icon icon={ANSWER_ICON[answer]} className="size-5" />
                  {tj(answer)}
                </label>
              ))}
            </div>
          </fieldset>
          {value.answer === "tidak_tersedia" && (
            <fieldset className="flex min-w-0 flex-col gap-2 rounded-2xl bg-bg-sunken p-3">
              {/* Legend mengambang supaya berada di dalam kotak, bukan di garis atasnya. */}
              <legend className="float-left mb-2 w-full font-semibold">{t("reasonLegend", { facility: name })}</legend>
              <div className="clear-both grid gap-2 sm:grid-cols-2">
                {REASONS.map((reason) => (
                  <label key={reason} className={TILE}>
                    <input id={`alasan-${facility}-${reason}`} type="radio" name={`alasan-${facility}`} checked={value.reason === reason} onChange={() => set({ reason })} className={RADIO} />
                    {ta(reason)}
                  </label>
                ))}
              </div>
            </fieldset>
          )}
        </>
      )}

      <TextField
        id={`catatan-${facility}`}
        label={t("noteLabel", { facility: name })}
        hint={t("noteHint")}
        value={value.note}
        max={DECISION_LIMITS.note}
        onValue={(note) => set({ note })}
        autoComplete="off"
      />

      {value.evidence && (
        <p className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">{t("publishes")}:</span>
          <AnswerChip {...shown} />
        </p>
      )}
    </div>
  );
}
