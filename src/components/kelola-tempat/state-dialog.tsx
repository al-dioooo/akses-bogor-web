"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useId, useRef, useState, type FormEvent } from "react";
import { changeState } from "@/app/(dasbor)/verifikasi/tempat/actions";
import { FieldError } from "@/components/akun/form-parts";
import { buttonClass } from "@/ui/button-styles";
import { fieldClass } from "@/ui/field-styles";
import { Icon } from "@/ui/icon";
import { IconEye, IconEyeOff, IconX } from "@/ui/icons";

// Tombol bahaya seperti Hapus akun: merah dengan teks, tidak hanya warna.
const DANGER_OUTLINE = "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border-2 border-border-error px-4.5 text-[0.9375rem] font-bold text-text-error hover:bg-surface-hover";
const DANGER_FILL = "inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-danger-fill px-4.5 text-[0.9375rem] font-bold text-text-on-brand hover:bg-danger-fill-hover disabled:opacity-70";

/**
 * Turunkan atau tayangkan lagi dengan dialog modal bawaan browser: fokus terkunci di dialog, Escape menutupnya, dan fokus
 * kembali ke tombol pembuka. Alasan wajib dan masuk riwayat (ADR-0051).
 */
export function StateDialog({ id, name, published }: { id: string; name: string; published: boolean }) {
  const t = useTranslations("KelolaTempat.state");
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [reason, setReason] = useState("");
  const [invalid, setInvalid] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const action = published ? "turunkan" : "tayangkan";

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (reason.trim().length < 5) {
      setInvalid(true);
      document.getElementById(`${titleId}-alasan`)?.focus();
      return;
    }
    setBusy(true);
    setProblem(null);
    const result = await changeState(id, action, reason.trim());
    setBusy(false);
    if (!result.ok) {
      setProblem(result.message);
      return;
    }
    dialog.current?.close();
    router.replace(`/verifikasi/tempat/${id}?tindakan=${published ? "diturunkan" : "ditayangkan"}`);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        className={published ? DANGER_OUTLINE : buttonClass("outline", "sm")}
      >
        <Icon icon={published ? IconEyeOff : IconEye} />
        {t(`${action}.open`)}
      </button>
      <dialog ref={dialog} aria-labelledby={titleId} className="panel-raised m-auto w-[min(32rem,calc(100%-2rem))] rounded-3xl p-0 text-text-primary backdrop:bg-surface-scrim">
        <form onSubmit={submit} noValidate className="flex flex-col gap-4 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <h2 id={titleId} className="font-heading text-xl font-bold">
              {t(`${action}.title`, { name })}
            </h2>
            <button type="button" onClick={() => dialog.current?.close()} className="grid size-11 shrink-0 place-items-center rounded-full hover:bg-surface-hover">
              <Icon icon={IconX} />
              <span className="sr-only">{t("close")}</span>
            </button>
          </div>
          <p className="text-text-secondary">{t(`${action}.body`)}</p>
          <div className="flex flex-col gap-2">
            <label htmlFor={`${titleId}-alasan`} className="font-semibold">
              {t("reasonLabel")}
            </label>
            <textarea
              id={`${titleId}-alasan`}
              value={reason}
              rows={3}
              maxLength={500}
              onChange={(event) => setReason(event.target.value)}
              aria-required="true"
              aria-invalid={invalid || undefined}
              aria-describedby={invalid ? `${titleId}-galat` : undefined}
              className={fieldClass(invalid, "py-3")}
            />
            <FieldError id={`${titleId}-galat`} message={invalid ? t("reasonError") : undefined} />
          </div>
          {problem && (
            <p role="alert" className="rounded-2xl border-2 border-border-error p-3">
              {problem}
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            <button disabled={busy} className={published ? DANGER_FILL : buttonClass("primary", "sm")}>
              {t(`${action}.confirm`)}
            </button>
            <button type="button" onClick={() => dialog.current?.close()} className={buttonClass("ghost", "sm")}>
              {t("cancel")}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
