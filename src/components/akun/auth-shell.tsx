import type { ReactNode } from "react";

/** Kerangka layar akun (Frame Akun): judul dua ketukan di atas panel isian yang lebarnya pas untuk satu kolom. */
export function AuthShell({ eyebrow, title, accent, intro, children }: { eyebrow: string; title: string; accent?: string; intro?: ReactNode; children: ReactNode }) {
  return (
    <main id="konten" className="page-width flex flex-1 flex-col items-center py-10 sm:py-16">
      <div className="flex w-full max-w-lg flex-col gap-6">
        <div className="flex flex-col items-start gap-3">
          <p className="lbl">{eyebrow}</p>
          <h1 className="display text-[clamp(2.25rem,1.6rem+2.4vw,3.25rem)] leading-none">
            {title}
            {accent && <span className="accent"> {accent}</span>}
          </h1>
          {intro && <div className="text-lg text-text-secondary">{intro}</div>}
        </div>
        <div className="panel flex flex-col gap-6 rounded-3xl p-5 sm:p-8">{children}</div>
      </div>
    </main>
  );
}

/** Kerangka pemuatan isi panel selagi sesi dibaca. */
export function AuthPanelSkeleton({ label }: { label: string }) {
  return (
    <div role="status" aria-label={label} className="flex flex-col gap-4">
      <div className="h-5 w-24 rounded-full bg-bg-sunken" />
      <div className="h-13 rounded-2xl bg-bg-sunken" />
      <div className="h-13 rounded-full bg-bg-sunken" />
    </div>
  );
}
