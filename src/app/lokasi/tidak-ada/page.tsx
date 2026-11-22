import { notFound } from "next/navigation";
import { Suspense } from "react";
import LokasiNotFound from "../[id]/not-found";

/**
 * Halaman 404 Detail lokasi yang dirender saat build (issue #150). src/proxy.ts menulis ulang alamat lokasi yang tidak
 * ada ke sini, karena di bawah Cache Components hanya halaman yang sudah 404 sejak build yang bisa menjawab status 404.
 *
 * `notFound()` dipanggil di dalam `<Suspense>`: saat build, Next.js mencatat status 404 dan tetap menyimpan isi di luar
 * batas itu sebagai HTML biasa, yaitu fallback berisi halaman "Lokasi ini tidak ada.". Bila dipanggil langsung di
 * halaman, hasil build hanya kerangka kosong yang dirender di browser. Setelah hydration, not-found.tsx segmen ini
 * menampilkan isi yang sama.
 */
export default function LokasiTidakAda() {
  return (
    <Suspense fallback={<LokasiNotFound />}>
      <NotFound />
    </Suspense>
  );
}

async function NotFound(): Promise<never> {
  notFound();
}
