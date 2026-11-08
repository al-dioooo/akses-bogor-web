"use client";

import { useTranslations } from "next-intl";
import { useActionState, useRef } from "react";
import { addTeamMember, removeTeamMember } from "@/app/verifikasi/(meja)/tim/actions";
import { FieldError, FormAlert, FormNotice, useFocusOnError } from "@/components/akun/form-parts";
import { EMPTY_FORM } from "@/components/akun/form-state";
import { buttonClass } from "@/ui/button-styles";
import { fieldClass } from "@/ui/field-styles";
import { Icon } from "@/ui/icon";
import { IconPlus, IconTrash } from "@/ui/icons";

/** Jadikan verifikator dengan email akun yang tepat; tidak ada pencarian pengguna (ADR-0035). */
export function AddMemberForm() {
  const t = useTranslations("Verifikasi.tim");
  const [state, action, pending] = useActionState(addTeamMember, EMPTY_FORM);
  const input = useRef<HTMLInputElement>(null);
  useFocusOnError(state, { email: input });
  const invalid = state.error?.field === "email";
  return (
    <form action={action} noValidate className="flex flex-col gap-3">
      <label htmlFor="email-verifikator" className="font-semibold">
        {t("email")}
      </label>
      <p id="email-verifikator-petunjuk" className="text-text-secondary">
        {t("emailHint")}
      </p>
      <input
        ref={input}
        id="email-verifikator"
        name="email"
        type="email"
        autoComplete="off"
        defaultValue={state.values?.email ?? ""}
        key={state.notice ?? "isian"}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? "email-verifikator-petunjuk email-verifikator-galat" : "email-verifikator-petunjuk"}
        className={fieldClass(invalid)}
      />
      <FieldError id="email-verifikator-galat" message={invalid ? state.error?.message : undefined} />
      {!invalid && <FormAlert message={state.error?.message} />}
      <FormNotice message={state.notice} />
      <button disabled={pending} className={buttonClass("primary", "sm", "self-start disabled:opacity-70")}>
        <Icon icon={IconPlus} />
        {pending ? t("adding") : t("add")}
      </button>
    </form>
  );
}

/** Cabut peran verifikator; akun itu langsung tidak bisa membuka meja verifikasi. */
export function RemoveMemberForm({ userId, name }: { userId: string; name: string }) {
  const t = useTranslations("Verifikasi.tim");
  const [state, action, pending] = useActionState(removeTeamMember, EMPTY_FORM);
  return (
    <form action={action} className="flex flex-col items-start gap-2">
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="name" value={name} />
      <button disabled={pending} className={buttonClass("ghost", "sm", "text-text-error disabled:opacity-70")}>
        <Icon icon={IconTrash} />
        {t("remove", { name })}
      </button>
      <FormAlert message={state.error?.message} />
      <FormNotice message={state.notice} />
    </form>
  );
}
