"use client";

import { useLayoutEffect, useRef } from "react";

/**
 * Peta mengunci gulir halaman lewat `body:has(> .peta-app:not([data-rute-tersembunyi]))` (globals.css), jadi kuncinya
 * sudah berlaku sejak HTML pertama, sebelum JavaScript jalan. Dengan Cache Components, Next menyimpan rute yang baru
 * ditinggalkan tetap terpasang tetapi tersembunyi (React `<Activity mode="hidden">`): `main.peta-app` masih anak body,
 * sehingga tanpa penanda ini halaman berikutnya ikut terkunci. Efek komponen di rute yang disembunyikan dibersihkan,
 * jadi penanda memasang atributnya saat itu dan melepasnya lagi begitu Peta tampil kembali, sebelum digambar.
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
