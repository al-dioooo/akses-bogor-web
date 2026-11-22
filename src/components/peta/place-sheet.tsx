"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useSyncExternalStore, type ReactNode, type RefObject } from "react";
import { Icon } from "@/ui/icon";
import { IconList, IconMap2 } from "@/ui/icons";

export type SheetHeight = "kecil" | "setengah";

const subscribeNothing = () => () => {};

type Props = {
  height: SheetHeight;
  onHeight: (height: SheetHeight) => void;
  /** Escape di dalam panel: menutup ringkasan lokasi dulu, lalu mengecilkan panel. */
  onEscape: () => void;
  title: string;
  /** Jumlah lokasi, diumumkan pembaca layar setiap kali berubah. */
  status: string;
  headingRef: RefObject<HTMLHeadingElement | null>;
  toggleRef: RefObject<HTMLButtonElement | null>;
  children: ReactNode;
};

/**
 * Panel daftar Peta: lembar bawah di ponsel dan panel samping mulai 768 px, kecil (hanya kepala) atau terbuka. Tombol
 * Daftar/Peta membuka dan mengecilkannya, dan Escape di dalam panel menutup ringkasan lalu mengecilkannya.
 */
export function PlaceSheet({ height, onHeight, onEscape, title, status, headingRef, toggleRef, children }: Props) {
  const t = useTranslations("Peta.lembar");
  const open = height !== "kecil";
  // Sebelum hydration (dan tanpa JavaScript) isi panel tidak dibuat inert, supaya daftar tetap bisa dipakai.
  const hydrated = useSyncExternalStore(subscribeNothing, () => true, () => false);
  const section = useRef<HTMLElement>(null);
  const escape = useRef(onEscape);
  useEffect(() => {
    escape.current = onEscape;
  });
  useEffect(() => {
    const element = section.current;
    if (!element) return;
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      event.preventDefault();
      escape.current();
    };
    element.addEventListener("keydown", onKey);
    return () => element.removeEventListener("keydown", onKey);
  }, []);
  return (
    <section ref={section} aria-labelledby="judul-daftar-peta" className="peta-lembar">
      <div className="flex shrink-0 flex-col">
        <div className="flex min-h-(--peta-kepala) items-center gap-3 pr-3 pl-5 md:py-2">
          <div className="flex min-w-0 flex-1 flex-col">
            <h2 id="judul-daftar-peta" ref={headingRef} tabIndex={-1} className="truncate font-heading text-lg leading-tight font-bold">
              {title}
            </h2>
            <p role="status" className="truncate text-sm text-text-secondary">
              {status}
            </p>
          </div>
          <button
            ref={toggleRef}
            type="button"
            aria-controls="isi-lembar"
            aria-expanded={open}
            aria-label={open ? t("showMap") : t("showList")}
            onClick={() => onHeight(open ? "kecil" : "setengah")}
            className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border-2 border-border-strong px-4 text-[0.9375rem] font-bold hover:bg-surface-hover"
          >
            <Icon icon={open ? IconMap2 : IconList} className="size-5" />
            {open ? t("map") : t("list")}
          </button>
        </div>
      </div>
      <div id="isi-lembar" inert={hydrated && !open} className="peta-lembar-isi">
        {children}
      </div>
    </section>
  );
}
