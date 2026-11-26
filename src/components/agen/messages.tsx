"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { AgentMessage } from "@/lib/percakapan";
import { buttonClass } from "@/ui/button-styles";
import { Icon } from "@/ui/icon";
import { IconAlertTriangle, IconCheck, IconCopy, IconRefresh, IconUser } from "@/ui/icons";
import { AgenMark } from "./agen-bar";
import { Sources } from "./sources";

/** Galat pertanyaan: teks dari API, dan apakah mencoba lagi masuk akal. */
export type Problem = { kind: "dihentikan" } | { kind: "galat"; text: string; busy: boolean; quota: boolean };

/** Pertanyaan pengguna, di kanan. `id` dipakai untuk menggulir pertanyaan ke atas saat jawabannya tiba. */
export function UserBubble({ id, content }: { id: string; content: string }) {
  const t = useTranslations("Agen.percakapan");
  return (
    <li data-pesan={id} className="flex justify-end pl-8 sm:pl-16">
      <div className="max-w-full rounded-3xl rounded-br-md bg-surface-brand-subtle px-4 py-3">
        <p className="sr-only">{t("you")}:</p>
        <p className="break-words whitespace-pre-line">{content}</p>
      </div>
    </li>
  );
}

/** Baris agen, di kiri: tanda Agen AI, nama, lalu isi. */
function AgentRow({ children, busy = false }: { children: ReactNode; busy?: boolean }) {
  const t = useTranslations("Agen.percakapan");
  return (
    <li className="flex gap-3" aria-busy={busy || undefined}>
      <AgenMark className="mt-0.5 size-8 rounded-[0.625rem]" />
      <div className="flex min-w-0 flex-1 flex-col items-start gap-3">
        <p className="lbl pt-2">{t("agent")}</p>
        {children}
      </div>
    </li>
  );
}

/** Jawaban agen: teks, sumber yang bisa dibuka, kartu, dan tombol salin. */
export function AgentReply({ message, cards, onAnnounce }: { message: AgentMessage; cards?: ReactNode; onAnnounce: (text: string) => void }) {
  return (
    <AgentRow>
      <p className="max-w-[65ch] text-[1.0625rem] leading-relaxed break-words whitespace-pre-line">{message.content}</p>
      <Sources sources={message.sources} />
      {cards}
      <CopyButton text={message.content} onAnnounce={onAnnounce} />
    </AgentRow>
  );
}

/** Indikator mengetik selama agen menyusun jawaban. Titiknya diam bila gerak dikurangi; teksnya selalu ada. */
export function Thinking() {
  const t = useTranslations("Agen.percakapan");
  return (
    <AgentRow busy>
      <p className="flex items-center gap-3 text-text-secondary">
        <span className="agen-titik" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        {t("thinking")}
      </p>
    </AgentRow>
  );
}

/**
 * Pertanyaan yang tidak terjawab: dihentikan pengguna, atau galat dari API. "Coba lagi" mengirim ulang pertanyaan yang
 * sama; jatah yang habis tidak ditawari coba lagi, dan pengunjung tanpa akun ditawari masuk untuk memakai jatah akun.
 */
export function ProblemRow({ problem, signedIn, onRetry }: { problem: Problem; signedIn: boolean; onRetry: () => void }) {
  const t = useTranslations("Agen.percakapan");
  const retry = (
    <button type="button" onClick={onRetry} className={buttonClass("outline", "sm")}>
      <Icon icon={IconRefresh} />
      {t("retry")}
    </button>
  );
  if (problem.kind === "dihentikan") {
    return (
      <AgentRow>
        <p className="text-text-secondary">{t("stopped")}</p>
        {retry}
      </AgentRow>
    );
  }
  return (
    <AgentRow>
      <div
        role="alert"
        className={`flex flex-col items-start gap-3 rounded-2xl p-4 ${problem.busy || problem.quota ? "bg-status-partial-bg text-text-primary" : "border-2 border-border-error"}`}
      >
        <p className={`flex gap-2 font-semibold ${problem.busy || problem.quota ? "" : "text-text-error"}`}>
          <Icon icon={IconAlertTriangle} className="mt-0.5 size-5 shrink-0" />
          {problem.text}
        </p>
        {problem.quota ? (
          !signedIn && (
            <Link href="/masuk?kembali=%2Fagen" className={buttonClass("outline", "sm")}>
              <Icon icon={IconUser} />
              {t("signIn")}
            </Link>
          )
        ) : (
          retry
        )}
      </div>
    </AgentRow>
  );
}

/** Menyalin teks jawaban. Hasilnya dibacakan lewat live region halaman, dan labelnya kembali setelah dua detik. */
function CopyButton({ text, onAnnounce }: { text: string; onAnnounce: (text: string) => void }) {
  const t = useTranslations("Agen.percakapan");
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      onAnnounce(t("copied"));
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      onAnnounce(t("copyFailed"));
    }
  }

  return (
    <button type="button" onClick={copy} className={buttonClass("ghost", "sm", "-ml-3 px-3 text-text-secondary hover:text-text-primary")}>
      <Icon icon={copied ? IconCheck : IconCopy} className="size-4.5" />
      {t("copy")}
      <span className="sr-only"> {t("copyLabel")}</span>
    </button>
  );
}
