"use client";

import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { StartPoint, type StartPointCopy } from "@/components/rute-jalan-kaki/start-point";
import type { LatLng } from "@/lib/laporan";
import { buttonClass } from "@/ui/button-styles";
import { Icon } from "@/ui/icon";
import { IconCurrentLocation, IconFocusCentered, IconMapPin, IconX } from "@/ui/icons";

export type Start = { point: LatLng; source: "perangkat" | "peta" };

const CHIP =
  "inline-flex min-h-11 max-w-full items-center gap-2 rounded-full border-2 border-border-subtle bg-surface-raised px-3.5 text-sm font-semibold transition-colors duration-200 hover:border-border-strong";

type Props = {
  start: Start | null;
  onStart: (start: Start | null) => void;
  /** Tempat dari "Tanya rute ke sini", dikirim bersama setiap pertanyaan sampai dihapus. */
  place?: { name: string };
  onClearPlace: () => void;
  copy: StartPointCopy;
};

/**
 * Chip di atas kotak tulis Agen AI (ADR-0054): titik awal, dan tempat dari "Tanya rute ke sini". Titik awal dipilih
 * di dialog dengan komponen titik awal kartu rute (penjelasan dulu, lalu lokasi perangkat atau titik di peta). Dialog
 * bawaan browser menjaga fokus di dalamnya, menutup dengan Esc, dan mengembalikan fokus ke chip.
 */
export function ContextChips({ start, onStart, place, onClearPlace, copy }: Props) {
  const t = useTranslations("Agen");
  const dialog = useRef<HTMLDialogElement>(null);
  // Peta pemilih titik baru dipasang saat dialog dibuka, supaya Mapbox tidak dimuat untuk setiap pengunjung.
  const [open, setOpen] = useState(false);

  function show() {
    setOpen(true);
    dialog.current?.showModal();
  }

  function choose(next: Start | null) {
    onStart(next);
    dialog.current?.close();
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={show} aria-haspopup="dialog" className={CHIP}>
        <Icon icon={start ? (start.source === "perangkat" ? IconFocusCentered : IconMapPin) : IconCurrentLocation} className="size-4.5 shrink-0 text-icon-brand" />
        {start ? (
          <span>
            <span className="sr-only">{t("awal.heading")}: </span>
            {t(`awal.chosen.${start.source}`)}
          </span>
        ) : (
          t("awal.none")
        )}
      </button>
      {place && (
        <p className={`${CHIP} pr-1 hover:border-border-subtle`}>
          <Icon icon={IconMapPin} className="size-4.5 shrink-0 text-icon-brand" />
          <span className="truncate">{t("tempat.label", { name: place.name })}</span>
          <button type="button" onClick={onClearPlace} className="grid size-9 shrink-0 place-items-center rounded-full hover:bg-surface-hover">
            <Icon icon={IconX} className="size-4.5" />
            <span className="sr-only">{t("tempat.clear", { name: place.name })}</span>
          </button>
        </p>
      )}
      <dialog
        ref={dialog}
        aria-labelledby="agen-awal-judul"
        onClose={() => setOpen(false)}
        className="m-auto max-h-[calc(100dvh-2rem)] w-[min(34rem,100%-2rem)] max-w-none overflow-y-auto overscroll-contain rounded-3xl border-0 bg-surface-raised p-0 text-text-primary backdrop:bg-surface-scrim"
      >
        <div className="flex flex-col gap-4 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <h2 id="agen-awal-judul" className="font-heading text-2xl font-bold">
              {t("awal.heading")}
            </h2>
            <button type="button" onClick={() => dialog.current?.close()} className="-mt-1 -mr-2 grid size-11 shrink-0 place-items-center rounded-full hover:bg-surface-hover">
              <Icon icon={IconX} />
              <span className="sr-only">{t("awal.close")}</span>
            </button>
          </div>
          {open && <StartPoint copy={copy} level={3} onStart={(point, source) => choose({ point, source })} />}
          {start && (
            <button type="button" onClick={() => choose(null)} className={buttonClass("ghost", "md", "self-start")}>
              {t("awal.clear")}
            </button>
          )}
        </div>
      </dialog>
    </div>
  );
}
