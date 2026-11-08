"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useRef, useState, useTransition } from "react";
import { clarifyDecision, publishDecision, rejectDecision, type DecisionResult } from "@/app/verifikasi/actions";
import { FieldError } from "@/components/akun/form-parts";
import { VERIFIER_REASONS, type RejectionReason, type Review } from "@/lib/verifikasi";
import { buttonClass } from "@/ui/button-styles";
import { fieldClass } from "@/ui/field-styles";
import { Icon } from "@/ui/icon";
import { IconAlertTriangle, IconCircleCheck, IconCircleX, IconMessage, IconSend, type Glyph } from "@/ui/icons";
import { DECISION_LIMITS, publishInput, type Decision, type Problem } from "./decision";

type Choice = "terbitkan" | "klarifikasi" | "tolak";
const CHOICES: { choice: Choice; icon: Glyph }[] = [
  { choice: "terbitkan", icon: IconCircleCheck },
  { choice: "klarifikasi", icon: IconMessage },
  { choice: "tolak", icon: IconCircleX },
];
const TILE =
  "relative flex cursor-pointer flex-col gap-1 rounded-2xl border-2 border-border-subtle bg-surface-raised p-3.5 transition-colors hover:border-border-strong " +
  "has-checked:border-border-strong has-checked:bg-text-primary has-checked:text-bg-canvas has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus-ring";
const RADIO = "absolute inset-0 z-10 cursor-pointer opacity-0";

type Props = { review: Review; decision: Decision; problems: Problem[]; onNote: (note: string) => void };

/**
 * Keputusan (FR-32, ADR-0036): Terbitkan, Minta klarifikasi, atau Tolak dengan alasan baku, plus catatan internal.
 * Hasilnya menggantikan formulir dan menerima fokus, supaya pembaca layar langsung membacanya.
 */
export function DecisionActions({ review, decision, problems, onNote }: Props) {
  const t = useTranslations("Pemeriksaan.actions");
  const tr = useTranslations("LaporanSaya.reason");
  const format = useFormatter();
  const router = useRouter();
  const [choice, setChoice] = useState<Choice>("terbitkan");
  const [question, setQuestion] = useState("");
  const [reason, setReason] = useState<RejectionReason | null>(null);
  const [problem, setProblem] = useState<{ field?: string; message: string } | null>(null);
  const [result, setResult] = useState<Extract<DecisionResult, { ok: true }> | null>(null);
  const [failure, setFailure] = useState<Extract<DecisionResult, { ok: false }> | null>(null);
  const [pending, start] = useTransition();
  const done = useRef<HTMLHeadingElement>(null);

  useEffect(() => done.current?.focus(), [result]);

  function submit() {
    setFailure(null);
    if (choice === "terbitkan" && problems.length) return setProblem({ message: t("publishBlocked") });
    if (choice === "klarifikasi" && !question.trim()) return setProblem({ field: "pertanyaan", message: t("questionEmpty") });
    if (choice === "tolak" && !reason) return setProblem({ field: "alasan", message: t("reasonEmpty") });
    setProblem(null);
    start(async () => {
      const outcome =
        choice === "terbitkan"
          ? await publishDecision(review.id, publishInput(review, decision))
          : choice === "klarifikasi"
            ? await clarifyDecision(review.id, question.trim(), decision.note)
            : await rejectDecision(review.id, reason!, decision.note);
      if (outcome.ok) setResult(outcome);
      else setFailure(outcome);
    });
  }

  if (result) {
    return (
      <div role="status" className="flex flex-col items-start gap-3 rounded-2xl bg-status-accessible-bg p-5 text-status-accessible-fg">
        <h3 ref={done} tabIndex={-1} className="flex items-center gap-2 font-heading text-xl font-bold">
          <Icon icon={IconCircleCheck} />
          {t(`done.${result.status}.title`)}
        </h3>
        <p className="text-text-primary">
          {t(`done.${result.status}.body`, { date: result.clarificationDueAt ? format.dateTime(new Date(result.clarificationDueAt), { dateStyle: "long", timeStyle: "short" }) : "" })}
        </p>
        <div className="flex flex-wrap gap-2">
          {result.placeId && (
            <Link href={`/lokasi/${result.placeId}`} className={buttonClass("primary", "sm")}>
              {t("viewPlace")}
            </Link>
          )}
          <Link href="/verifikasi" className={buttonClass("outline", "sm")}>
            {t("backToQueue")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <fieldset className="flex min-w-0 flex-col gap-2">
        <legend className="mb-2 font-semibold">{t("legend")}</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {CHOICES.map(({ choice: value, icon }) => (
            <label key={value} className={TILE}>
              <input type="radio" name="keputusan" checked={choice === value} onChange={() => (setChoice(value), setProblem(null))} className={RADIO} />
              <span className="flex items-center gap-2 font-bold">
                <Icon icon={icon} />
                {t(`choice.${value}`)}
              </span>
              <span className="text-sm opacity-80">{t(`choiceHint.${value}`)}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {choice === "klarifikasi" &&
        (review.status === "klarifikasi" ? (
          <p className="rounded-2xl bg-bg-sunken p-4">{t("clarifyOpen")}</p>
        ) : (
          <div className="flex flex-col gap-2">
            <label htmlFor="pertanyaan" className="font-semibold">
              {t("questionLabel")}
            </label>
            <p id="pertanyaan-petunjuk" className="text-text-secondary">
              {t("questionHint")}
            </p>
            <textarea
              id="pertanyaan"
              rows={3}
              maxLength={DECISION_LIMITS.reviewerNote}
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              aria-invalid={problem?.field === "pertanyaan" ? true : undefined}
              aria-describedby={`pertanyaan-petunjuk${problem?.field === "pertanyaan" ? " pertanyaan-galat" : ""}`}
              className={fieldClass(problem?.field === "pertanyaan", "py-3")}
            />
            <FieldError id="pertanyaan-galat" message={problem?.field === "pertanyaan" ? problem.message : undefined} />
          </div>
        ))}

      {choice === "tolak" && (
        <fieldset className="flex min-w-0 flex-col gap-2" aria-describedby={problem?.field === "alasan" ? "alasan-galat" : undefined}>
          <legend className="mb-2 font-semibold">{t("reasonLegend")}</legend>
          {VERIFIER_REASONS.map((value) => (
            <label key={value} className={TILE}>
              <input type="radio" name="alasan-tolak" checked={reason === value} onChange={() => (setReason(value), setProblem(null))} className={RADIO} />
              <span className="font-bold">{tr(`${value}.label`)}</span>
              <span className="text-sm opacity-80">{t("messageFor", { message: tr(`${value}.message`) })}</span>
            </label>
          ))}
          <FieldError id="alasan-galat" message={problem?.field === "alasan" ? problem.message : undefined} />
        </fieldset>
      )}

      <div className="flex flex-col gap-2">
        <label htmlFor="catatan-verifikator" className="font-semibold">
          {t("noteLabel")}
        </label>
        <p id="catatan-verifikator-petunjuk" className="text-text-secondary">
          {t("noteHint")}
        </p>
        <textarea
          id="catatan-verifikator"
          rows={2}
          maxLength={DECISION_LIMITS.reviewerNote}
          value={decision.note}
          onChange={(event) => onNote(event.target.value)}
          aria-describedby="catatan-verifikator-petunjuk"
          className={fieldClass(false, "py-3")}
        />
      </div>

      {problem && !problem.field && <p className="font-semibold text-text-error">{problem.message}</p>}
      {failure && (
        <div role="alert" className="flex flex-col items-start gap-3 rounded-2xl border-2 border-border-error p-4 text-text-error">
          <p className="flex items-start gap-2 font-semibold">
            <Icon icon={IconAlertTriangle} className="mt-0.5" />
            {t("galat", { message: failure.message })}
          </p>
          {(failure.code === "sudah_diputuskan" || failure.code === "lokasi_berubah") && (
            <button type="button" onClick={() => router.refresh()} className={buttonClass("outline", "sm")}>
              {t("reload")}
            </button>
          )}
        </div>
      )}

      <button type="submit" disabled={pending || (choice === "klarifikasi" && review.status === "klarifikasi")} className={buttonClass(choice === "tolak" ? "ink" : "primary", "md", "self-start disabled:opacity-60")}>
        <Icon icon={choice === "klarifikasi" ? IconSend : choice === "tolak" ? IconCircleX : IconCircleCheck} />
        {pending ? t("pending") : t(choice === "terbitkan" ? "publish" : choice === "klarifikasi" ? "clarify" : "reject")}
      </button>
      <p aria-live="polite" className="sr-only">
        {pending ? t("pending") : ""}
      </p>
    </form>
  );
}
