"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { buttonClass } from "@/ui/button-styles";
import { Icon } from "@/ui/icon";
import { IconShieldCheck, IconX } from "@/ui/icons";
import type { MapHandle } from "./map/mount";

type Phase = "awal" | "tanya" | "mencari" | "ketemu" | "ditolak" | "gagal" | "luar" | "tidak-didukung";

/**
 * "Lokasi saya": penjelasan dulu (sekali per kunjungan, kecuali izin lokasi sudah diberikan), lalu lokasi perangkat dari
 * browser. Posisi hanya dipakai untuk menggeser peta dan menaruh titik di sana; tidak dikirim ke AksesBogor dan tidak
 * disimpan.
 */
export function useLocate(map: MapHandle | null) {
  const [phase, setPhase] = useState<Phase>("awal");
  const agreed = useRef(false);
  // Peta yang sedang tampil saat lokasi datang, bukan peta saat tombol ditekan: peta itu bisa sudah dibuat ulang (Coba
  // lagi) atau dihancurkan (pindah halaman).
  const current = useRef(map);
  useEffect(() => {
    current.current = map;
    return () => {
      current.current = null;
    };
  }, [map]);

  function locate() {
    setPhase("mencari");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const shown = current.current;
        if (!shown) return setPhase("awal");
        setPhase(shown.showUser({ lng: coords.longitude, lat: coords.latitude }) ? "ketemu" : "luar");
      },
      (error) => setPhase(error.code === error.PERMISSION_DENIED ? "ditolak" : "gagal"),
      // Posisi kasar sudah cukup untuk menggeser peta, dan lebih cepat serta hemat baterai.
      { enableHighAccuracy: false, timeout: 15_000, maximumAge: 60_000 },
    );
  }

  async function start() {
    if (!("geolocation" in navigator)) return setPhase("tidak-didukung");
    if (!agreed.current) {
      const permission = await navigator.permissions?.query({ name: "geolocation" }).catch(() => null);
      if (permission?.state !== "granted") return setPhase("tanya");
      agreed.current = true;
    }
    locate();
  }

  function allow() {
    agreed.current = true;
    locate();
  }

  const close = useCallback(() => setPhase("awal"), []);
  return { phase, start, allow, close };
}

/** Penjelasan izin lokasi dan pesan hasilnya, di bawah kontrol peta di ponsel dan di sampingnya di layar lebar. */
export function LocatePanel({ locate, buttonRef }: { locate: ReturnType<typeof useLocate>; buttonRef: RefObject<HTMLButtonElement | null> }) {
  const t = useTranslations("Peta.lokasiSaya");
  const title = useRef<HTMLHeadingElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const { phase, allow, close } = locate;

  function cancel() {
    close();
    buttonRef.current?.focus();
  }

  /** Fokus kembali ke tombol Lokasi saya dulu (menutup penjelasan), lalu lokasi dicari; hasilnya diumumkan. */
  function accept() {
    buttonRef.current?.focus();
    allow();
  }

  // Penjelasan menerima fokus saat dibuka. Escape menutupnya lalu fokus kembali ke tombol Lokasi saya, dan penjelasan
  // juga tertutup saat fokus pindah ke luarnya, karena kartunya bisa menutupi panel daftar di layar pendek.
  useEffect(() => {
    const element = dialog.current;
    if (phase !== "tanya" || !element) return;
    title.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      close();
      buttonRef.current?.focus();
    };
    const onFocusOut = (event: FocusEvent) => {
      if (event.relatedTarget instanceof Node && !element.contains(event.relatedTarget)) close();
    };
    element.addEventListener("keydown", onKey);
    element.addEventListener("focusout", onFocusOut);
    return () => {
      element.removeEventListener("keydown", onKey);
      element.removeEventListener("focusout", onFocusOut);
    };
  }, [phase, close, buttonRef]);

  // Pesan hasil ditutup begitu fokus atau sentuhan pindah ke luar kontrol peta, seperti notifikasi singkat; isinya sudah
  // diumumkan lewat role="status". Di ponsel landscape kartunya menutupi kepala panel daftar, jadi tidak boleh tertinggal.
  const showsMessage = phase !== "awal" && phase !== "tanya" && phase !== "ketemu";
  useEffect(() => {
    if (!showsMessage) return;
    const controls = buttonRef.current?.closest(".peta-kontrol");
    const onOutside = (event: Event) => {
      if (event.target instanceof Node && !controls?.contains(event.target)) close();
    };
    document.addEventListener("focusin", onOutside);
    document.addEventListener("pointerdown", onOutside);
    return () => {
      document.removeEventListener("focusin", onOutside);
      document.removeEventListener("pointerdown", onOutside);
    };
  }, [showsMessage, close, buttonRef]);

  if (phase === "tanya") {
    return (
      <div ref={dialog} role="dialog" aria-labelledby="judul-lokasi-saya" aria-describedby="isi-lokasi-saya" className="peta-lokasi panel-raised flex flex-col gap-3 rounded-2xl p-4">
        <h2 id="judul-lokasi-saya" ref={title} tabIndex={-1} className="font-heading font-bold">
          {t("title")}
        </h2>
        <p id="isi-lokasi-saya" className="flex gap-2.5 text-sm">
          <Icon icon={IconShieldCheck} className="mt-0.5 size-5 shrink-0 text-icon-brand" />
          {t("body")}
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={accept} className={buttonClass("primary", "sm")}>
            {t("allow")}
          </button>
          <button type="button" onClick={cancel} className={buttonClass("outline", "sm")}>
            {t("cancel")}
          </button>
        </div>
      </div>
    );
  }

  const messages: Partial<Record<Phase, string>> = {
    mencari: t("locating"),
    ditolak: t("denied"),
    gagal: t("unavailable"),
    luar: t("outside"),
    "tidak-didukung": t("unsupported"),
  };
  const message = messages[phase];
  return (
    <>
      <p role="status" className="sr-only">
        {phase === "ketemu" ? t("found") : (message ?? "")}
      </p>
      {message && (
        <div className="peta-lokasi panel-raised flex items-start gap-2 rounded-2xl py-2 pr-2 pl-4">
          <p aria-hidden="true" className="flex-1 py-2.5 text-sm font-semibold">
            {message}
          </p>
          {phase !== "mencari" && (
            <button type="button" onClick={cancel} aria-label={t("close")} className="grid size-11 shrink-0 place-items-center rounded-full hover:bg-surface-hover">
              <Icon icon={IconX} />
            </button>
          )}
        </div>
      )}
    </>
  );
}
