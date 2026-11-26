"use client";

import { useLayoutEffect, useRef } from "react";

/**
 * Agen AI mengunci gulir halaman lewat `body:has(> .agen-app:not([data-rute-tersembunyi]))` (globals.css) sejak HTML
 * pertama. Dengan Cache Components, Next menyimpan rute yang baru ditinggalkan tetap terpasang tetapi tersembunyi
 * (React `<Activity mode="hidden">`), mis. setelah pengguna membuka tautan di kartu. Penanda ini memberi atribut saat
 * rute disembunyikan dan melepasnya saat tampil lagi, supaya halaman berikutnya tidak ikut terkunci (sama dengan Peta).
 */
export function RouteHiddenMarker() {
  const marker = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const main = marker.current?.closest("main");
    if (!main) return;
    main.removeAttribute("data-rute-tersembunyi");
    return () => main.setAttribute("data-rute-tersembunyi", "");
  }, []);
  return <span ref={marker} hidden />;
}
