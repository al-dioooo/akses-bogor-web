"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useSyncExternalStore, type KeyboardEvent, type ReactNode, type RefObject } from "react";
import { Icon } from "@/ui/icon";
import { IconList, IconMap2 } from "@/ui/icons";

export type SheetHeight = "kecil" | "setengah" | "penuh";
export const SHEET_HEIGHTS: SheetHeight[] = ["kecil", "setengah", "penuh"];

const subscribeNothing = () => () => {};

/** Lembar bisa ditarik hanya di ponsel; mulai 768 px panel samping tidak punya pegangan. */
const narrow = () => matchMedia("(width < 48rem)").matches;

/**
 * Tinggi lembar untuk ketiga tinggi tetap, diukur dengan menukar data-tinggi di main sesaat (tanpa animasi, karena
 * data-menyeret sudah dipasang).
 */
function snapHeights(main: HTMLElement, sheet: HTMLElement) {
  const current = main.dataset.tinggi;
  const heights = SHEET_HEIGHTS.map((height) => {
    main.dataset.tinggi = height;
    return sheet.getBoundingClientRect().height;
  });
  main.dataset.tinggi = current;
  return heights;
}

/**
 * Tinggi tetap tujuan setelah lembar dilepas: yang terdekat, atau satu tingkat searah tarikan bila jari dilepas cepat
 * (lebih dari 0,5 px per ms).
 */
export function snapAfterDrag(heights: number[], height: number, velocity: number): SheetHeight {
  const nearest = heights.reduce((best, value, index) => (Math.abs(value - height) < Math.abs(heights[best] - height) ? index : best), 0);
  if (Math.abs(velocity) < 0.5) return SHEET_HEIGHTS[nearest];
  const below = heights.findLastIndex((value) => value < height - 1);
  const above = heights.findIndex((value) => value > height + 1);
  if (velocity > 0) return SHEET_HEIGHTS[above === -1 ? 2 : above];
  return SHEET_HEIGHTS[below === -1 ? 0 : below];
}

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
 * Panel daftar Peta: lembar bawah di ponsel (kecil, setengah, penuh) dan panel samping mulai 768 px (kecil atau
 * terbuka). Pegangan di atas lembar adalah penggeser vertikal: ketuk untuk berganti tinggi, tombol panah, Home, dan End
 * untuk keyboard dan pembaca layar. Tombol Daftar/Peta melakukan hal yang sama tanpa menyeret (WCAG 2.5.7).
 */
export function PlaceSheet({ height, onHeight, onEscape, title, status, headingRef, toggleRef, children }: Props) {
  const t = useTranslations("Peta.lembar");
  const open = height !== "kecil";
  // Sebelum hydration (dan tanpa JavaScript) isi panel tidak dibuat inert, supaya daftar tetap bisa dipakai.
  const hydrated = useSyncExternalStore(subscribeNothing, () => true, () => false);
  const section = useRef<HTMLElement>(null);
  const escape = useRef(onEscape);
  const change = useRef(onHeight);
  useEffect(() => {
    escape.current = onEscape;
    change.current = onHeight;
  });
  const dragged = useRef(false);
  const height$ = useRef(height);
  useEffect(() => {
    height$.current = height;
  });

  // Menarik kepala lembar dengan jari atau tetikus (ponsel saja). Selama ditarik, tinggi ditulis langsung ke
  // --peta-bawah di main; setelah dilepas, lembar berhenti di tinggi tetap terdekat. Ketukan tanpa tarikan diteruskan
  // sebagai klik biasa.
  useEffect(() => {
    const sheet = section.current;
    const head = sheet?.firstElementChild as HTMLElement | null;
    const main = sheet?.closest("main");
    if (!sheet || !head || !main) return;
    let drag: { id: number; startY: number; start: number; heights: number[]; lastY: number; lastT: number; velocity: number } | null = null;

    const onDown = (event: PointerEvent) => {
      if (!narrow() || event.button !== 0 || (event.target as Element).closest("button, a")) return;
      dragged.current = false;
      // Ditangkap oleh elemen yang ditekan (mis. pegangan), supaya ketukan tetap menjadi klik di elemen itu.
      (event.target as Element).setPointerCapture(event.pointerId);
      drag = { id: event.pointerId, startY: event.clientY, start: sheet.getBoundingClientRect().height, heights: [], lastY: event.clientY, lastT: event.timeStamp, velocity: 0 };
    };
    const onMove = (event: PointerEvent) => {
      if (!drag || event.pointerId !== drag.id) return;
      const distance = drag.startY - event.clientY;
      if (!dragged.current) {
        if (Math.abs(distance) < 6) return;
        dragged.current = true;
        main.dataset.menyeret = "";
        drag.heights = snapHeights(main, sheet);
      }
      const [min, , max] = drag.heights;
      main.style.setProperty("--peta-bawah", `${Math.min(max, Math.max(min, drag.start + distance))}px`);
      const elapsed = event.timeStamp - drag.lastT;
      if (elapsed > 0) drag.velocity = (drag.lastY - event.clientY) / elapsed;
      drag.lastY = event.clientY;
      drag.lastT = event.timeStamp;
    };
    const onUp = (event: PointerEvent) => {
      if (!drag || event.pointerId !== drag.id) return;
      const finished = drag;
      drag = null;
      if (!dragged.current) return;
      const target = snapAfterDrag(finished.heights, sheet.getBoundingClientRect().height, finished.velocity);
      delete main.dataset.menyeret;
      main.style.removeProperty("--peta-bawah");
      if (target === height$.current) return;
      change.current(target);
    };
    head.addEventListener("pointerdown", onDown);
    head.addEventListener("pointermove", onMove);
    head.addEventListener("pointerup", onUp);
    head.addEventListener("pointercancel", onUp);
    return () => {
      head.removeEventListener("pointerdown", onDown);
      head.removeEventListener("pointermove", onMove);
      head.removeEventListener("pointerup", onUp);
      head.removeEventListener("pointercancel", onUp);
    };
  }, []);

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
  const step = (delta: number) => onHeight(SHEET_HEIGHTS[Math.min(2, Math.max(0, SHEET_HEIGHTS.indexOf(height) + delta))]);

  function onHandleKey(event: KeyboardEvent<HTMLDivElement>) {
    const keys: Record<string, () => void> = {
      ArrowUp: () => step(1),
      ArrowRight: () => step(1),
      ArrowDown: () => step(-1),
      ArrowLeft: () => step(-1),
      Home: () => onHeight("kecil"),
      End: () => onHeight("penuh"),
      Enter: () => onHeight(SHEET_HEIGHTS[(SHEET_HEIGHTS.indexOf(height) + 1) % 3]),
      " ": () => onHeight(SHEET_HEIGHTS[(SHEET_HEIGHTS.indexOf(height) + 1) % 3]),
    };
    if (!keys[event.key]) return;
    event.preventDefault();
    keys[event.key]();
  }

  return (
    <section ref={section} aria-labelledby="judul-daftar-peta" className="peta-lembar">
      <div className="flex shrink-0 touch-none flex-col md:touch-auto">
        <div
          role="slider"
          tabIndex={0}
          aria-label={t("handle")}
          aria-orientation="vertical"
          aria-valuemin={0}
          aria-valuemax={2}
          aria-valuenow={SHEET_HEIGHTS.indexOf(height)}
          aria-valuetext={t(`tinggi.${height}`)}
          onClick={() => {
            // Klik yang mengakhiri tarikan tidak mengganti tinggi lagi.
            if (dragged.current) return void (dragged.current = false);
            onHeight(SHEET_HEIGHTS[(SHEET_HEIGHTS.indexOf(height) + 1) % 3]);
          }}
          onKeyDown={onHandleKey}
          className="peta-pegangan flex h-7 shrink-0 cursor-grab touch-none items-center justify-center rounded-t-3xl md:hidden"
        >
          <span aria-hidden="true" className="h-1.5 w-10 rounded-full bg-border-field" />
        </div>
        <div className="flex min-h-[calc(var(--peta-kepala)-1.75rem)] items-center gap-3 pr-3 pl-5 md:min-h-(--peta-kepala) md:py-2">
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
