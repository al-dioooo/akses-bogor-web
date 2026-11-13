import type { ReactNode } from "react";

/**
 * Satu bagian halaman statis (Tentang, halaman edukasi): judul h2 di kiri dan isi di kanan mulai layar sedang,
 * bertumpuk di ponsel. `id` dipakai sebagai jangkar tautan dan nama bagian untuk pembaca layar.
 */
export function PageRow({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="grid scroll-mt-24 gap-4 border-t border-border-subtle py-10 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] md:gap-10">
      <h2 id={id} className="font-heading text-2xl font-bold md:text-3xl">
        {title}
      </h2>
      <div className="flex max-w-[65ch] flex-col gap-4 text-lg">{children}</div>
    </section>
  );
}
