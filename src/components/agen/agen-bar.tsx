import type { ReactNode } from "react";
import { Icon } from "@/ui/icon";
import { IconSparkles } from "@/ui/icons";

/** Tanda Agen AI: kotak ungu dengan kilau. Dekoratif; namanya selalu tertulis di sebelahnya. */
export function AgenMark({ className = "size-9 rounded-xl" }: { className?: string }) {
  return (
    <span aria-hidden="true" className={`grid shrink-0 place-items-center bg-brand-fill text-text-on-brand ${className}`}>
      <Icon icon={IconSparkles} className="size-[58%]" />
    </span>
  );
}

/**
 * Baris atas Agen AI (ADR-0054): judul halaman dan, selama ada percakapan, tombol "Percakapan baru". Dipakai halaman
 * server (saat memuat dan saat Agen AI belum dibuka) dan komponen obrolan, jadi judul selalu ada sejak HTML pertama.
 */
export function AgenBar({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="agen-atas">
      <div className="agen-kolom flex min-h-15 items-center justify-between gap-3">
        <h1 className="flex items-center gap-2.5 font-heading text-lg font-bold">
          <AgenMark className="size-8 rounded-[0.625rem]" />
          {title}
        </h1>
        {action}
      </div>
    </div>
  );
}
