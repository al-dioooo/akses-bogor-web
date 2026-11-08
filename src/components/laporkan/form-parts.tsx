"use client";

import { useTranslations } from "next-intl";
import { forwardRef, type InputHTMLAttributes } from "react";
import { FieldError } from "@/components/akun/form-parts";
import type { FieldError as StepError, Step } from "@/lib/isian-laporan";
import { fieldClass } from "@/ui/field-styles";
import { Icon } from "@/ui/icon";
import { IconAlertTriangle, IconCheck } from "@/ui/icons";

const NUMBERED = ["1", "2", "3"] as const;

/** Penanda langkah (Laporkan · Langkah 1–3): langkah aktif ditandai `aria-current="step"`, bukan hanya warna. */
export function Stepper({ step }: { step: Step }) {
  const t = useTranslations("Laporkan.steps");
  const index = step === "ringkasan" ? 3 : NUMBERED.indexOf(step);
  return (
    <nav aria-label={t("label")}>
      <ol className="grid grid-cols-4 gap-1.5">
        {[...NUMBERED, "ringkasan" as const].map((item, i) => {
          const current = item === step;
          const done = i < index;
          return (
            <li key={item} aria-current={current ? "step" : undefined} className="flex flex-col gap-1.5">
              <span className={`h-1.5 rounded-full ${current || done ? "bg-brand-fill" : "bg-bg-sunken"}`} />
              <span className={`flex items-center gap-1 text-xs sm:text-sm ${current ? "font-bold text-text-primary" : "text-text-secondary"}`}>
                {done && <Icon icon={IconCheck} className="size-4" />}
                <span className="max-sm:sr-only">{t(item)}</span>
                <span className="sr-only">{current ? t("current") : done ? t("done") : ""}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * Ringkasan galat di atas langkah: menerima fokus setelah "Lanjut" gagal dan setiap butirnya memindah fokus ke kolom
 * yang bermasalah (WCAG 3.3.1, 3.3.3).
 */
export const ErrorSummary = forwardRef<HTMLDivElement, { errors: StepError[] }>(function ErrorSummary({ errors }, ref) {
  const t = useTranslations("Laporkan.errors");
  if (!errors.length) return null;
  return (
    <div ref={ref} tabIndex={-1} role="group" aria-labelledby="ringkasan-galat-judul" className="flex flex-col gap-3 rounded-2xl border-2 border-border-error p-4 text-text-error">
      <h3 id="ringkasan-galat-judul" className="flex items-center gap-2 font-heading font-bold">
        <Icon icon={IconAlertTriangle} />
        {t("title")}
      </h3>
      <ul className="flex flex-col gap-1">
        {errors.map((error) => (
          <li key={`${error.field}-${error.message}`}>
            <a
              href={`#${error.field}`}
              onClick={(event) => {
                const target = document.getElementById(error.field);
                if (!target) return;
                event.preventDefault();
                target.focus();
                target.scrollIntoView?.({ block: "center" });
              }}
              className="inline-flex min-h-11 items-center font-semibold underline underline-offset-2"
            >
              {t(error.message, error.values)}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
});

/** Galat untuk satu kolom dari daftar galat langkah. */
export function errorFor(errors: StepError[], field: string) {
  return errors.find((error) => error.field === field);
}

type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "value" | "onChange"> & {
  id: string;
  label: string;
  hint?: string;
  value: string;
  max: number;
  error?: StepError;
  onValue: (value: string) => void;
};

/**
 * Kolom teks satu baris dengan petunjuk, hitungan karakter, dan galat yang tertaut lewat `aria-describedby`. Batas
 * karakter tidak memotong ketikan (tanpa `maxLength`), supaya isian yang ditempel tetap utuh dan galatnya terbaca.
 */
export function TextField({ id, label, hint, value, max, error, onValue, ...input }: TextFieldProps) {
  const t = useTranslations("Laporkan");
  const describedBy = [hint ? `${id}-petunjuk` : "", `${id}-hitung`, error ? `${id}-galat` : ""].filter(Boolean).join(" ");
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="font-semibold">
        {label}
      </label>
      {hint && (
        <p id={`${id}-petunjuk`} className="text-text-secondary">
          {hint}
        </p>
      )}
      <input
        {...input}
        id={id}
        type="text"
        value={value}
        onChange={(event) => onValue(event.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={fieldClass(Boolean(error))}
      />
      <p id={`${id}-hitung`} className={`text-sm ${value.length > max ? "font-semibold text-text-error" : "text-text-secondary"}`}>
        {t("counter", { count: value.length, max })}
      </p>
      <FieldError id={`${id}-galat`} message={error ? t(`errors.${error.message}`, error.values) : undefined} />
    </div>
  );
}
