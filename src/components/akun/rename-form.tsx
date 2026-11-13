"use client";

import { useActionState, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { renameProfile } from "@/app/akun/actions";
import { buttonClass } from "@/ui/button-styles";
import { fieldClass } from "@/ui/field-styles";
import { FieldError, FormAlert, FormNotice, useFocusOnError } from "./form-parts";
import { EMPTY_FORM } from "./form-state";

/** Ubah nama tampilan (FR-12). Email tidak bisa diubah di MVP (ADR-0029). */
export function RenameForm({ currentName }: { currentName: string }) {
  const t = useTranslations("AkunSaya");
  const [state, action, pending] = useActionState(renameProfile, EMPTY_FORM);
  const [name, setName] = useState(currentName);
  const input = useRef<HTMLInputElement>(null);
  useFocusOnError(state, { displayName: input });
  const invalid = state.error?.field === "displayName";

  return (
    <form action={action} noValidate className="flex flex-col gap-3">
      <label htmlFor="ubah-nama" className="font-semibold">
        {t("nameLabel")}
      </label>
      <p id="ubah-nama-petunjuk" className="text-text-secondary">
        {t("nameHint")}
      </p>
      <input
        ref={input}
        id="ubah-nama"
        name="displayName"
        type="text"
        autoComplete="nickname"
        aria-required="true"
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? "ubah-nama-petunjuk ubah-nama-galat" : "ubah-nama-petunjuk"}
        value={name}
        onChange={(event) => setName(event.target.value)}
        className={fieldClass(invalid)}
      />
      <FieldError id="ubah-nama-galat" message={invalid ? state.error?.message : undefined} />
      {!state.error?.field && <FormAlert message={state.error?.message} />}
      <FormNotice message={state.notice} />
      <button disabled={pending} className={buttonClass("outline", "sm", "self-start disabled:opacity-70")}>
        {pending ? t("saving") : t("save")}
      </button>
    </form>
  );
}
