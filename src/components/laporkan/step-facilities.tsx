"use client";

import { useTranslations } from "next-intl";
import { FACILITIES, type Facility } from "@/lib/api";
import { ANSWERS, LIMITS, REASONS, type FacilityState, type FieldError as StepError, type ReportDraft } from "@/lib/isian-laporan";
import { Icon } from "@/ui/icon";
import { ANSWER_ICON, FACILITY_ICON } from "@/ui/place-icons";
import { errorFor, TextField } from "./form-parts";

// Pilihan jawaban dan alasan: radio asli menutupi seluruh pilihan, cincin fokus dan tanda pilihan digambar di label.
const TILE =
  "relative flex min-h-13 cursor-pointer rounded-2xl border-2 border-border-subtle bg-surface-raised px-3.5 py-2.5 " +
  "transition-colors duration-200 hover:border-border-strong has-checked:border-border-strong has-checked:bg-text-primary has-checked:text-bg-canvas " +
  "has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus-ring";
// `z-10` supaya radio tetap di atas teks petunjuk, yang membuat stacking context sendiri karena `opacity`.
const ANSWER = `${TILE} items-start gap-3`;
const REASON = `${TILE} flex-col`;
const RADIO = "absolute inset-0 z-10 cursor-pointer opacity-0";

type Props = { draft: ReportDraft; errors: StepError[]; update: (change: Partial<ReportDraft>) => void };

/**
 * Langkah 2 (FR-24): empat fasilitas, masing-masing satu dari empat jawaban dengan bawaan Belum tahu (ADR-0017).
 * Tidak tersedia boleh diberi alasan, dan setiap jawaban boleh diberi catatan maksimal 200 karakter (ADR-0022).
 */
export function StepFacilities({ draft, errors, update }: Props) {
  const t = useTranslations("Laporkan.fasilitas");
  const tf = useTranslations("Fasilitas");
  const ta = useTranslations("Alasan");

  const change = (facility: Facility, next: Partial<FacilityState>) => {
    const current = draft.facilities[facility];
    const merged = { ...current, ...next };
    // Alasan hanya untuk Tidak tersedia.
    if (merged.answer !== "tidak_tersedia") merged.reason = null;
    update({ facilities: { ...draft.facilities, [facility]: merged } });
  };

  return (
    <div className="flex flex-col gap-6">
      <p className="text-lg text-text-secondary">{t("intro")}</p>
      {FACILITIES.map((facility) => {
        const state = draft.facilities[facility];
        const name = tf(facility);
        return (
          <section key={facility} aria-labelledby={`fasilitas-${facility}`} className="flex flex-col gap-4 rounded-3xl border-2 border-border-subtle p-4 sm:p-5">
            <h3 id={`fasilitas-${facility}`} className="flex items-center gap-3 font-heading text-xl font-bold">
              <span className="grid size-10 place-items-center rounded-xl bg-bg-sunken text-icon-brand">
                <Icon icon={FACILITY_ICON[facility]} className="size-5.5" />
              </span>
              {name}
            </h3>
            <p id={`petunjuk-${facility}`} className="text-text-secondary">
              {t(`hint.${facility}`)}
            </p>

            <fieldset aria-describedby={`petunjuk-${facility}`} className="flex flex-col gap-2">
              <legend className="sr-only">{t("answerLegend", { facility: name })}</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {ANSWERS.map((answer) => (
                  <label key={answer} className={ANSWER}>
                    <input
                      type="radio"
                      name={`jawaban-${facility}`}
                      value={answer}
                      checked={state.answer === answer}
                      onChange={() => change(facility, { answer })}
                      className={RADIO}
                    />
                    <Icon icon={ANSWER_ICON[answer]} className="mt-0.5 size-5" />
                    <span className="flex flex-col">
                      <span className="font-semibold">{t(`answers.${answer}`)}</span>
                      <span className="text-sm opacity-80">{t(`answerHint.${answer}`)}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            {state.answer === "tidak_tersedia" && (
              <fieldset className="flex flex-col gap-2 rounded-2xl bg-bg-sunken p-3">
                <legend className="mb-1 pt-1 font-semibold">{t("reasonLegend")}</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {REASONS.map((reason) => (
                    <label key={reason} className={REASON}>
                      <input
                        type="radio"
                        name={`alasan-${facility}`}
                        value={reason}
                        checked={state.reason === reason}
                        onChange={() => change(facility, { reason })}
                        className={RADIO}
                      />
                      <span className="font-semibold">{ta(reason)}</span>
                      <span className="text-sm opacity-80">{t(`reasonHint.${reason}`)}</span>
                    </label>
                  ))}
                  <label className={REASON}>
                    <input type="radio" name={`alasan-${facility}`} value="" checked={state.reason === null} onChange={() => change(facility, { reason: null })} className={RADIO} />
                    <span className="font-semibold">{t("reasonSkip")}</span>
                  </label>
                </div>
              </fieldset>
            )}

            <TextField
              id={`catatan-${facility}`}
              label={t("noteLabel", { facility: name })}
              hint={t("noteHint")}
              value={state.note}
              max={LIMITS.note}
              error={errorFor(errors, `catatan-${facility}`)}
              onValue={(note) => change(facility, { note })}
              autoComplete="off"
            />
          </section>
        );
      })}
    </div>
  );
}
