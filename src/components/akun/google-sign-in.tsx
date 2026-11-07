"use client";

import Script from "next/script";
import { useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { signInGoogle } from "@/app/masuk/actions";
import { FormAlert } from "./form-parts";

type CredentialResponse = { credential?: string };
type GoogleIdentity = {
  accounts: {
    id: {
      initialize(options: Record<string, unknown>): void;
      renderButton(parent: HTMLElement, options: Record<string, unknown>): void;
    };
  };
};

declare global {
  interface Window {
    google?: GoogleIdentity;
  }
}

const GIS_SCRIPT = "https://accounts.google.com/gsi/client";

const darkMode = () => {
  const theme = document.documentElement.dataset.theme;
  return theme ? theme === "gelap" : window.matchMedia("(prefers-color-scheme: dark)").matches;
};

/**
 * Tombol "Masuk dengan Google" dari Google Identity Services (ADR-0014). Tombolnya dirender Google, jadi skripnya
 * hanya dimuat di halaman Masuk. ID token dikirim ke Server Action, lalu diperiksa API terhadap client ID AksesBogor.
 * Bila skrip Google gagal dimuat, pengguna diarahkan ke kode email.
 */
export function GoogleSignIn({ clientId, kembali }: { clientId: string; kembali: string | null }) {
  const t = useTranslations("Masuk");
  const container = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  const render = () => {
    const google = window.google;
    const parent = container.current;
    if (!google || !parent) return setFailed(true);
    google.accounts.id.initialize({
      client_id: clientId,
      ux_mode: "popup",
      context: "signin",
      itp_support: true,
      use_fedcm_for_button: true,
      callback: ({ credential }: CredentialResponse) => {
        if (!credential) return;
        setError(undefined);
        startTransition(async () => {
          const state = await signInGoogle(credential, kembali);
          if (state.error) setError(state.error.message);
        });
      },
    });
    google.accounts.id.renderButton(parent, {
      type: "standard",
      theme: darkMode() ? "filled_black" : "outline",
      size: "large",
      text: "signin_with",
      shape: "pill",
      logo_alignment: "center",
      locale: "id",
      // Lebar tombol Google antara 200 dan 400 px.
      width: Math.max(200, Math.min(400, Math.floor(parent.getBoundingClientRect().width))),
    });
  };

  return (
    <div className="flex flex-col gap-3" aria-busy={pending || undefined}>
      <Script src={GIS_SCRIPT} strategy="afterInteractive" onReady={render} onError={() => setFailed(true)} />
      {failed ? (
        <p className="text-text-secondary">{t("googleFailed")}</p>
      ) : (
        // Tinggi tetap supaya halaman tidak bergeser saat tombol Google muncul.
        <div ref={container} className="flex min-h-11 w-full justify-center" />
      )}
      {pending && <p role="status">{t("googleSigningIn")}</p>}
      <FormAlert message={error} />
    </div>
  );
}
