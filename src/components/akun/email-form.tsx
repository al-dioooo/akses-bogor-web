"use client";

import { useActionState, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { sendCode } from "@/app/masuk/actions";
import { buttonClass } from "@/ui/button-styles";
import { fieldClass } from "@/ui/field-styles";
import { Icon } from "@/ui/icon";
import { IconMail } from "@/ui/icons";
import { FieldError, FormAlert, useFocusOnError } from "./form-parts";
import { EMPTY_FORM } from "./form-state";

/** Langkah pertama masuk dengan email: alamat email, lalu "Kirim kode" (FR-10, ADR-0014). */
export function EmailForm({ defaultEmail = "", kembali }: { defaultEmail?: string; kembali: string | null }) {
  const t = useTranslations("Masuk");
  const [state, action, pending] = useActionState(sendCode, EMPTY_FORM);
  const [email, setEmail] = useState(defaultEmail);
  const input = useRef<HTMLInputElement>(null);
  useFocusOnError(state, { email: input });
  const invalid = state.error?.field === "email";

  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      {kembali && <input type="hidden" name="kembali" value={kembali} />}
      <div className="flex flex-col gap-2">
        <label htmlFor="email" className="font-semibold">
          {t("emailLabel")}
        </label>
        <p id="email-petunjuk" className="text-text-secondary">
          {t("emailHint")}
        </p>
        <input
          ref={input}
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          aria-required="true"
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? "email-petunjuk email-galat" : "email-petunjuk"}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={fieldClass(invalid)}
        />
        <FieldError id="email-galat" message={invalid ? state.error?.message : undefined} />
      </div>
      {!state.error?.field && <FormAlert message={state.error?.message} />}
      <button disabled={pending} className={buttonClass("primary", "md", "w-full disabled:opacity-70")}>
        <Icon icon={IconMail} />
        {pending ? t("sending") : t("submit")}
      </button>
    </form>
  );
}
