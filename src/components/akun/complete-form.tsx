"use client";

import { useActionState, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { completeProfile } from "@/app/masuk/actions";
import { PRIVACY_POLICY_PATH, PRIVACY_POLICY_VERSION, TERMS_PATH } from "@/lib/kebijakan";
import { buttonClass } from "@/ui/button-styles";
import { fieldClass } from "@/ui/field-styles";
import { Icon } from "@/ui/icon";
import { IconExternalLink } from "@/ui/icons";
import { FieldError, FormAlert, useFocusOnError } from "./form-parts";
import { EMPTY_FORM } from "./form-state";

/**
 * Lengkapi Akun (FR-11, FR-12): nama tampilan dan persetujuan Kebijakan Privasi. Tautan kebijakan berada di luar label
 * kotak centang, supaya mengetuk tautan tidak ikut mencentang, dan membuka tab baru supaya isian tidak hilang. Syarat
 * Layanan disetujui lewat tombol simpan, terpisah dari kotak centang privasi (ADR-0040).
 */
export function CompleteForm({
  defaultName,
  kembali,
  versionLabel,
  termsVersionLabel,
}: {
  defaultName: string;
  kembali: string | null;
  versionLabel: string;
  termsVersionLabel: string;
}) {
  const t = useTranslations("Lengkapi");
  const [state, action, pending] = useActionState(completeProfile, EMPTY_FORM);
  const [name, setName] = useState(defaultName);
  const nameInput = useRef<HTMLInputElement>(null);
  const consentInput = useRef<HTMLInputElement>(null);
  useFocusOnError(state, { displayName: nameInput, consent: consentInput });
  const nameInvalid = state.error?.field === "displayName";
  const consentInvalid = state.error?.field === "consent";

  return (
    <form action={action} noValidate className="flex flex-col gap-6">
      {kembali && <input type="hidden" name="kembali" value={kembali} />}
      <input type="hidden" name="privacyPolicyVersion" value={PRIVACY_POLICY_VERSION} />

      <div className="flex flex-col gap-2">
        <label htmlFor="nama-tampilan" className="font-semibold">
          {t("nameLabel")}
        </label>
        <p id="nama-petunjuk" className="text-text-secondary">
          {t("nameHint")}
        </p>
        <input
          ref={nameInput}
          id="nama-tampilan"
          name="displayName"
          type="text"
          autoComplete="nickname"
          aria-required="true"
          aria-invalid={nameInvalid || undefined}
          aria-describedby={nameInvalid ? "nama-petunjuk nama-galat" : "nama-petunjuk"}
          value={name}
          onChange={(event) => setName(event.target.value)}
          className={fieldClass(nameInvalid)}
        />
        <FieldError id="nama-galat" message={nameInvalid ? state.error?.message : undefined} />
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 font-semibold">{t("privacyTitle")}</legend>
        <ul className="list-disc pl-5 text-text-secondary">
          <li>{t("privacyStored")}</li>
          <li>{t("privacyVerifier")}</li>
          <li>{t("privacyDelete")}</li>
        </ul>
        <a
          href={PRIVACY_POLICY_PATH}
          target="_blank"
          rel="noopener"
          className="inline-flex min-h-11 items-center gap-2 self-start font-semibold text-text-brand underline underline-offset-2"
        >
          {t("privacyLink", { version: versionLabel })}
          <Icon icon={IconExternalLink} className="size-4.5" />
        </a>
        <div className="flex items-start gap-3 rounded-2xl bg-bg-sunken p-4">
          <input
            ref={consentInput}
            id="setuju-privasi"
            name="acceptPrivacyPolicy"
            type="checkbox"
            value="ya"
            aria-invalid={consentInvalid || undefined}
            aria-describedby={consentInvalid ? "setuju-galat" : undefined}
            className="mt-0.5 size-6 shrink-0 accent-(--color-brand-fill)"
          />
          <label htmlFor="setuju-privasi" className="font-semibold">
            {t("consentLabel")}
          </label>
        </div>
        <FieldError id="setuju-galat" message={consentInvalid ? state.error?.message : undefined} />
      </fieldset>

      {!state.error?.field && <FormAlert message={state.error?.message} />}
      <p className="text-text-secondary">
        {t.rich("termsNotice", {
          version: termsVersionLabel,
          link: (chunks) => (
            <a href={TERMS_PATH} target="_blank" rel="noopener" className="font-semibold text-text-brand underline underline-offset-2">
              {chunks}
              <Icon icon={IconExternalLink} className="ml-1 inline size-4.5 align-[-0.2em]" />
            </a>
          ),
        })}
      </p>
      <button disabled={pending} className={buttonClass("primary", "md", "w-full disabled:opacity-70")}>
        {pending ? t("saving") : t("submit")}
      </button>
    </form>
  );
}
