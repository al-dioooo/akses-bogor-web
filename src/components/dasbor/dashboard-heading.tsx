import type { ReactNode } from "react";

/**
 * Judul halaman dasbor: label, judul dengan satu kata aksen (ADR-0027), dan satu kalimat pengantar. Lebih kecil dari
 * judul halaman publik, karena di dasbor isi halaman lebih penting daripada judulnya.
 */
export function DashboardHeading({ id, label, title, accent, intro }: { id: string; label: string; title: string; accent?: string; intro?: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-3">
      <p className="lbl">{label}</p>
      <h1 id={id} className="display text-[clamp(2rem,1.55rem+1.6vw,2.75rem)] leading-[1.05] break-words">
        {title}
        {accent && <span className="accent"> {accent}</span>}
      </h1>
      {intro && <div className="max-w-2xl text-lg text-text-secondary">{intro}</div>}
    </div>
  );
}
