"use client";

import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";
import { placeUrl, shareLink, type ShareResult } from "@/lib/bagikan";
import { buttonClass } from "@/ui/button-styles";
import { fieldClass } from "@/ui/field-styles";
import { Icon } from "@/ui/icon";
import { IconAlertTriangle, IconCircleCheck, IconShare } from "@/ui/icons";

/**
 * Tombol Bagikan di Detail lokasi (FR-08). Memakai lembar berbagi perangkat bila ada, atau menyalin alamat halaman.
 * Hasilnya ditulis di kotak status yang selalu ada di DOM, jadi pembaca layar membacakannya tanpa memindahkan fokus.
 * Bila menyalin gagal, alamatnya ditampilkan di kolom yang langsung terpilih untuk disalin sendiri. Tanpa widget
 * pihak ketiga dan tanpa parameter tambahan di alamat.
 */
export function ShareButton({ id, title }: { id: string; title: string }) {
  const t = useTranslations("Detail.share");
  const [result, setResult] = useState<ShareResult | null>(null);
  const [url, setUrl] = useState("");
  const [pending, setPending] = useState(false);
  const field = useRef<HTMLInputElement>(null);
  const fieldId = useId();
  const errorId = useId();

  useEffect(() => {
    // Fokus pindah ke alamat yang sudah terpilih, jadi pengguna keyboard tinggal menekan Ctrl+C.
    if (result === "failed") field.current?.focus();
  }, [result]);

  async function share() {
    if (pending) return;
    // Dikosongkan dulu supaya pesan yang sama dibacakan lagi pada klik berikutnya.
    setResult(null);
    setPending(true);
    const link = placeUrl(window.location.origin, id);
    setUrl(link);
    setResult(await shareLink({ title, url: link }, navigator));
    setPending(false);
  }

  return (
    <div className="flex flex-col items-start gap-3">
      <button type="button" onClick={share} aria-disabled={pending || undefined} className={buttonClass("outline", "sm")}>
        <Icon icon={IconShare} />
        {t("button")}
      </button>
      <div role="status" className="empty:hidden">
        {result === "copied" && (
          <p className="flex items-start gap-2 rounded-2xl bg-status-accessible-bg px-4 py-3 font-semibold text-status-accessible-fg">
            <Icon icon={IconCircleCheck} className="mt-0.5 size-5" />
            {t("copied")}
          </p>
        )}
        {result === "failed" && (
          <p id={errorId} className="flex items-start gap-2 font-semibold text-text-error">
            <Icon icon={IconAlertTriangle} className="mt-0.5 size-5" />
            {t("failed")}
          </p>
        )}
      </div>
      {result === "failed" && (
        <div className="flex w-full max-w-md flex-col gap-1.5">
          <label htmlFor={fieldId} className="font-semibold">
            {t("urlLabel")}
          </label>
          <input
            ref={field}
            id={fieldId}
            type="url"
            readOnly
            aria-describedby={errorId}
            value={url}
            onFocus={(event) => event.currentTarget.select()}
            className={fieldClass(false, "font-mono text-sm")}
          />
        </div>
      )}
    </div>
  );
}
