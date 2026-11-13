"use client";

import { useActionState, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { resendCode } from "@/app/masuk/actions";
import { buttonClass } from "@/ui/button-styles";
import { FormAlert, FormNotice } from "./form-parts";
import { EMPTY_FORM } from "./form-state";

/**
 * Kirim ulang kode setelah jeda 60 detik (ADR-0014). Tombolnya tetap bisa difokus selama jeda (aria-disabled) dan
 * keterangannya menyebut sisa detik. Hitung mundurnya tidak dibacakan setiap detik; pembaca layar hanya diberi tahu
 * sekali saat kode baru bisa diminta. Tanpa JavaScript tombolnya tetap mengirim formulir, dan server menjawab berapa
 * lama lagi harus menunggu.
 */
export function ResendCode({ initialWait }: { initialWait: number }) {
  const t = useTranslations("KodeMasuk");
  const [state, action, pending] = useActionState(resendCode, EMPTY_FORM);
  const [wait, setWait] = useState(initialWait);
  // Ada hitung mundur di tampilan ini, jadi akhirnya perlu diumumkan.
  const [counted, setCounted] = useState(initialWait > 0);
  const [handled, setHandled] = useState(state);

  // Setiap jawaban server memulai hitung mundur baru.
  if (state !== handled) {
    setHandled(state);
    if (state.resendAfter !== undefined) {
      setWait(state.resendAfter);
      if (state.resendAfter > 0) setCounted(true);
    }
  }

  useEffect(() => {
    if (wait <= 0) return;
    const timer = setTimeout(() => setWait((value) => Math.max(0, value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [wait]);

  const waiting = wait > 0;
  return (
    <form action={action} className="flex flex-col gap-3">
      <button
        aria-disabled={waiting || pending || undefined}
        aria-describedby="kirim-ulang-keterangan"
        onClick={(event) => {
          if (waiting || pending) event.preventDefault();
        }}
        className={buttonClass("outline", "md", "w-full aria-disabled:cursor-not-allowed aria-disabled:opacity-60")}
      >
        {t("resend")}
      </button>
      <p id="kirim-ulang-keterangan" className="text-center text-text-secondary">
        {waiting ? t("resendWait", { seconds: wait }) : t("resendReady")}
      </p>
      <FormAlert message={state.error?.message} />
      <FormNotice message={state.notice}>
        {/* Dibacakan sekali saat jeda selesai, tidak setiap detik. */}
        {!waiting && counted && <span className="sr-only">{t("resendReady")}</span>}
      </FormNotice>
    </form>
  );
}
