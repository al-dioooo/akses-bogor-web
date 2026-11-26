"use client";

import { useTranslations } from "next-intl";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { buttonClass } from "@/ui/button-styles";
import { Icon } from "@/ui/icon";
import { IconStack2 } from "@/ui/icons";

/** Lapisan tematik di Peta (ADR-0053); hanya satu yang tampil sekaligus. */
export type ThemeChoice = "tidak" | "prioritas" | "disabilitas" | "aksesibel";

/**
 * Pemilih Peta tematik (ADR-0053): tombol yang membuka daftar pilihan di bawahnya. Setiap pilihan tombol `aria-pressed`;
 * memilih langsung menerapkan lapisannya, menutup daftar, dan mengembalikan fokus ke tombol pemilih. Daftar tertutup
 * dengan Escape, ketukan di luar, atau saat fokus keluar. Tingginya dibatasi sampai di atas Bottom nav, sisanya digulir.
 */
export function ThematicChooser({
  options,
  value,
  onChange,
  open,
  onOpen,
}: {
  options: readonly ThemeChoice[];
  value: ThemeChoice;
  onChange: (value: ThemeChoice) => void;
  /** Terbuka atau tidak dipegang komponen peta, supaya bagian peta di bawahnya ikut diukur. */
  open: boolean;
  onOpen: (open: boolean) => void;
}) {
  const t = useTranslations("Peta.tematik");
  const id = useId();
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const outside = (event: Event) => {
      const target = event.target as Node;
      if (!panel.current?.contains(target) && !button.current?.contains(target)) onOpen(false);
    };
    // Escape menutup daftar dari mana pun fokusnya (tombol pemilih atau daftarnya), lalu fokus kembali ke tombol.
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      onOpen(false);
      button.current?.focus();
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("focusin", outside);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("focusin", outside);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onOpen]);

  // Daftar berhenti 8 px di atas Bottom nav (atau tepi bawah layar mulai 1280 px) dan atribusi peta; isi yang tidak muat
  // digulir.
  const [maxHeight, setMaxHeight] = useState<number | undefined>(undefined);
  useLayoutEffect(() => {
    const element = panel.current;
    const main = element?.closest("main");
    if (!open || !element || !main) return;
    const update = () => {
      const probe = document.createElement("div");
      probe.style.cssText = "position:absolute;visibility:hidden;height:var(--peta-nav)";
      main.append(probe);
      const nav = probe.offsetHeight;
      probe.remove();
      // Atribusi peta tidak boleh tertutup, supaya tautannya tetap bisa diketuk.
      const top = element.getBoundingClientRect().top;
      const attribution = main.querySelector(".mapboxgl-ctrl-attrib")?.getBoundingClientRect();
      const floor = Math.min(window.innerHeight - nav, attribution && attribution.top > top && attribution.left < element.getBoundingClientRect().right ? attribution.top : Infinity);
      setMaxHeight(Math.max(132, Math.floor(floor - top - 8)));
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={button}
        type="button"
        aria-label={t("button")}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => onOpen(!open)}
        className={buttonClass(value !== "tidak" ? "ink" : "outline", "sm", `shadow-[0_8px_20px_-10px_var(--color-shadow-soft)] ${value !== "tidak" ? "" : "bg-surface-raised"}`)}
      >
        <Icon icon={IconStack2} />
        {/* Di ponsel label pendek, supaya tombol dan kontrol peta muat dalam satu baris (di landscape juga bersama pencarian). */}
        <span className="max-[22rem]:sr-only md:hidden">{t("short")}</span>
        <span className="max-md:hidden">{t("button")}</span>
      </button>
      <div ref={panel} id={id} hidden={!open} style={{ maxHeight }} className="peta-pilihan panel-raised flex-col gap-1 rounded-2xl p-2 [&:not([hidden])]:flex">
        <h2 id={`${id}-judul`} className="px-3 pt-2 font-heading font-bold">
          {t("title")}
        </h2>
        <p className="px-3 pb-1 text-sm text-text-secondary">{t("intro")}</p>
        <ul aria-labelledby={`${id}-judul`} className="flex flex-col gap-1">
          {options.map((option) => {
            const pressed = option === value;
            return (
              // Seluruh baris bisa diketuk (::after tombol menutupi penjelasannya), tetapi nama tombol hanya labelnya;
              // penjelasan dibacakan sebagai deskripsi.
              <li
                key={option}
                className={`relative rounded-xl has-[button:hover]:bg-surface-hover has-[button:focus-visible]:outline-2 has-[button:focus-visible]:outline-focus-ring ${pressed ? "bg-surface-brand-subtle" : ""}`}
              >
                <button
                  type="button"
                  aria-pressed={pressed}
                  aria-describedby={`${id}-${option}-isi`}
                  onClick={() => {
                    onChange(option);
                    onOpen(false);
                    button.current?.focus();
                  }}
                  className="flex min-h-11 w-full items-center gap-3 px-3 pt-2 text-left font-semibold outline-none after:absolute after:inset-0 after:rounded-xl"
                >
                  {/* Tanda pilihan seperti tombol radio; keadaan terpilih ada di aria-pressed. */}
                  <span aria-hidden="true" className="grid size-5 shrink-0 place-items-center rounded-full border-2 border-border-strong">
                    {pressed && <span className="size-2.5 rounded-full bg-text-primary" />}
                  </span>
                  {t(`pilihan.${option}.label`)}
                </button>
                <p id={`${id}-${option}-isi`} className="pr-3 pb-2 pl-11 text-sm text-text-secondary">
                  {t(`pilihan.${option}.body`)}
                </p>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
