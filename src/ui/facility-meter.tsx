import type { FacilitySummary, Status } from "@/lib/api";

const FILL: Record<Status, string> = {
  aksesibel: "bg-status-accessible-solid",
  sebagian: "bg-status-partial-solid",
  tidak_aksesibel: "bg-status-inaccessible-solid",
  belum_diketahui: "bg-status-unknown-solid",
};

/**
 * Ringkasan "X dari Y" sebagai Y ruas: X terisi warna status, yang belum diketahui bergaris, sisanya kosong
 * (ADR-0018). Hanya penguat visual; angkanya selalu tertulis di teks sebelahnya.
 */
export function FacilityMeter({ summary, status, className = "" }: { summary: FacilitySummary; status: Status; className?: string }) {
  if (!summary.relevant) return null;
  const segments = Array.from({ length: summary.relevant }, (_, i) =>
    i < summary.available ? FILL[status] : i < summary.available + summary.unknown ? "meter-unknown" : "bg-bg-sunken",
  );
  return (
    <span aria-hidden="true" className={`flex gap-1 ${className}`}>
      {segments.map((tone, i) => (
        <span key={i} className={`h-2.5 flex-1 rounded-[3px] ${tone}`} />
      ))}
    </span>
  );
}
