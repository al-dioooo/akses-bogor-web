"use client";

import Link from "next/link";
import { useActionState, useRef } from "react";
import { useTranslations } from "next-intl";
import { deleteProfile } from "@/app/akun/actions";
import { buttonClass } from "@/ui/button-styles";
import { Icon } from "@/ui/icon";
import { IconTrash } from "@/ui/icons";
import { FieldError, FormAlert, useFocusOnError } from "./form-parts";
import { EMPTY_FORM } from "./form-state";

/**
 * Konfirmasi Hapus Akun (FR-13): centang dulu, lalu tombol Danger. Tombolnya tidak dimatikan sebelum dicentang, supaya
 * tetap bisa difokus; tanpa centang, server menjawab galat yang menunjuk ke kotak centang.
 */
export function DeleteForm() {
  const t = useTranslations("HapusAkun");
  const [state, action, pending] = useActionState(deleteProfile, EMPTY_FORM);
  const checkbox = useRef<HTMLInputElement>(null);
  useFocusOnError(state, { confirm: checkbox });
  const invalid = state.error?.field === "confirm";

  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <div className="flex items-start gap-3 rounded-2xl border-2 border-border-error p-4">
        <input
          ref={checkbox}
          id="konfirmasi-hapus"
          name="confirm"
          type="checkbox"
          value="ya"
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? "konfirmasi-galat" : undefined}
          className="mt-0.5 size-6 shrink-0 accent-(--color-danger-fill)"
        />
        <label htmlFor="konfirmasi-hapus" className="font-semibold">
          {t("confirmLabel")}
        </label>
      </div>
      <FieldError id="konfirmasi-galat" message={invalid ? state.error?.message : undefined} />
      {!state.error?.field && <FormAlert message={state.error?.message} />}
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          disabled={pending}
          className="inline-flex min-h-13 items-center justify-center gap-2 rounded-full bg-danger-fill px-6 font-bold text-text-on-brand hover:bg-danger-fill-hover disabled:opacity-70"
        >
          <Icon icon={IconTrash} />
          {pending ? t("deleting") : t("submit")}
        </button>
        <Link href="/akun" className={buttonClass("outline", "md")}>
          {t("cancel")}
        </Link>
      </div>
    </form>
  );
}
