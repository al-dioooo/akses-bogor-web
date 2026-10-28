import type { FacilitySummary, Status } from "@/lib/api";

const RING: Record<Status, string> = {
  aksesibel: "stroke-status-accessible-solid",
  sebagian: "stroke-status-partial-solid",
  tidak_aksesibel: "stroke-status-inaccessible-solid",
  belum_diketahui: "stroke-status-unknown-solid",
};

/** Score ring (ADR-0018): angka X dan teks "dari Y". Busurnya hanya penguat visual, jadi disembunyikan dari pembaca layar. */
export function ScoreRing({ summary, status, ofLabel }: { summary: FacilitySummary; status: Status; ofLabel: string }) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const ratio = summary.relevant ? summary.available / summary.relevant : 1;
  return (
    <div className="relative grid size-32 shrink-0 place-items-center">
      <svg viewBox="0 0 100 100" aria-hidden="true" className="absolute inset-0 -rotate-90">
        <circle cx="50" cy="50" r={radius} fill="none" strokeWidth="9" className="stroke-border-subtle" />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          strokeWidth="9"
          // Ujung bulat pada busur sepanjang nol tampak sebagai titik, jadi hanya dipakai bila ada busur.
          strokeLinecap={ratio > 0 ? "round" : "butt"}
          strokeDasharray={`${circumference * ratio} ${circumference}`}
          className={RING[status]}
        />
      </svg>
      <span className="flex flex-col items-center leading-none">
        <span className="font-heading text-4xl font-extrabold tracking-[-0.04em] tabular-nums">{summary.available}</span>
        <span className="mt-1 text-sm text-text-secondary">{ofLabel}</span>
      </span>
    </div>
  );
}
