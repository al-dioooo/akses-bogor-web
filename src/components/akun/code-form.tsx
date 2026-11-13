"use client";

import { useActionState, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { checkCode } from "@/app/masuk/actions";
import { buttonClass } from "@/ui/button-styles";
import { fieldClass } from "@/ui/field-styles";
import { FieldError, FormAlert, useFocusOnError } from "./form-parts";
import { EMPTY_FORM } from "./form-state";

/**
 * Satu kolom untuk kode 6 digit (ADR-0014), bukan enam kotak: bisa ditempel, diisi otomatis dari SMS atau email
 * (`one-time-code`), dan dibaca pembaca layar sebagai satu isian. Tanpa `maxLength` dan `pattern`, supaya kode yang
 * ditempel dengan spasi tidak terpotong; server merapikannya.
 */
export function CodeForm({ kembali }: { kembali: string | null }) {
  const t = useTranslations("KodeMasuk");
  const [state, action, pending] = useActionState(checkCode, EMPTY_FORM);
  const [code, setCode] = useState("");
  const input = useRef<HTMLInputElement>(null);
  useFocusOnError(state, { code: input });
  const invalid = state.error?.field === "code";

  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      {kembali && <input type="hidden" name="kembali" value={kembali} />}
      <div className="flex flex-col gap-2">
        <label htmlFor="kode" className="font-semibold">
          {t("codeLabel")}
        </label>
        <p id="kode-petunjuk" className="text-text-secondary">
          {t("codeHint")}
        </p>
        <input
          ref={input}
          id="kode"
          name="code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          enterKeyHint="done"
          spellCheck={false}
          aria-required="true"
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? "kode-petunjuk kode-galat" : "kode-petunjuk"}
          value={code}
          onChange={(event) => setCode(event.target.value)}
          className={fieldClass(invalid, "font-mono text-xl tracking-[0.3em]")}
        />
        <FieldError id="kode-galat" message={invalid ? state.error?.message : undefined} />
      </div>
      {!state.error?.field && <FormAlert message={state.error?.message} />}
      <button disabled={pending} className={buttonClass("primary", "md", "w-full disabled:opacity-70")}>
        {pending ? t("checking") : t("submit")}
      </button>
    </form>
  );
}
