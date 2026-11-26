"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "@/ui/icon";
import { IconChevronRight, IconList } from "@/ui/icons";

/** Lapisan tematik yang punya kunci; nama ini juga namespace teksnya di `Peta.<nama>`. */
export type KeyName = "prioritas" | "disabilitas";

/**
 * Kunci lapisan tematik yang mengambang di atas peta (ADR-0053): judul, tombol ke tabel atau daftar di panel, dan isi
 * (legenda warna sebagai teks, catatan batas data, sumber).
 *
 * Di ponsel kunci mulai ringkas, satu baris berisi `summary` dan tombol "Catatan" yang membuka seluruh isinya, supaya
 * lapisan berwarna tetap terlihat. Tingginya dibatasi supaya tidak masuk ke balik panel daftar: isi yang tidak muat
 * digulir dan kunci bisa difokus untuk itu, dan bila satu baris pun tidak muat, komponen peta menyembunyikannya (tabel
 * atau daftar dengan catatan yang sama ada di panel daftar).
 */
export function MapKey({
  name,
  title,
  summary,
  compact,
  open: forced = false,
  onShowTable,
  children,
}: {
  name: KeyName;
  title: string;
  /** Baris ringkas di ponsel, mis. skala warna dan judul pendek. Dekoratif: judul lengkap tetap ada untuk pembaca layar. */
  summary: ReactNode;
  /** Ponsel: kunci mulai ringkas. */
  compact: boolean;
  /** Selalu terbuka, mis. selama ada pesan galat yang harus terbaca. */
  open?: boolean;
  onShowTable: () => void;
  children: ReactNode;
}) {
  const t = useTranslations(`Peta.${name}`);
  const section = useRef<HTMLElement>(null);
  const [chosen, setChosen] = useState<boolean | null>(null);
  const open = forced || (chosen ?? !compact);

  // Kunci yang harus digulir masuk urutan Tab, supaya isinya bisa digulir dengan tombol panah.
  useEffect(() => {
    const element = section.current;
    if (!element) return;
    const observer = new ResizeObserver(() => {
      if (element.scrollHeight > element.clientHeight + 1) element.tabIndex = 0;
      else element.removeAttribute("tabindex");
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={section} aria-labelledby={`judul-kunci-${name}`} className={`peta-kunci panel-raised flex flex-col rounded-2xl ${open ? "gap-3 p-4" : "py-1 pr-2 pl-3.5"}`}>
      <div className="flex items-center gap-1">
        <h2 id={`judul-kunci-${name}`} className={open ? "mr-auto font-heading leading-tight font-bold" : "sr-only"}>
          {title}
        </h2>
        {!open && (
          <p aria-hidden="true" className="mr-auto inline-flex min-w-0 items-center gap-2 text-sm font-bold">
            {summary}
          </p>
        )}
        {open && (
          <button
            type="button"
            onClick={onShowTable}
            aria-label={t("showTable")}
            className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm font-bold hover:bg-surface-hover"
          >
            <Icon icon={IconList} className="size-4.5" />
            {t("table")}
          </button>
        )}
        <button
          type="button"
          aria-expanded={open}
          aria-controls={`isi-kunci-${name}`}
          aria-label={open ? t("less") : t("moreLabel")}
          onClick={() => setChosen(!open)}
          className="-mr-1 inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-1 rounded-full px-2.5 text-sm font-bold hover:bg-surface-hover"
        >
          {!open && t("more")}
          <Icon icon={IconChevronRight} className={`size-5 transition-transform duration-200 ${open ? "-rotate-90" : "rotate-90"}`} />
        </button>
      </div>
      <div id={`isi-kunci-${name}`} hidden={!open} className="flex flex-col gap-3">
        {children}
      </div>
    </section>
  );
}

/** Kotak warna kecil untuk kunci, legenda, dan tabel; dekoratif karena nama kelasnya selalu ditulis di sebelahnya. */
export function Swatch({ color, className = "size-4" }: { color: string; className?: string }) {
  return <span aria-hidden="true" className={`shrink-0 rounded-sm border border-border-strong ${className}`} style={{ background: `var(${color})` }} />;
}
