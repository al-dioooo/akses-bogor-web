import type { Glyph } from "./icons";

/** Ikon garis 24 × 24 dengan tebal garis 1.75, seperti di aksesin-web. Selalu dekoratif: makna ditulis di teks sebelahnya. */
export function Icon({ icon, className = "size-5" }: { icon: Glyph; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={`shrink-0 ${className}`}
    >
      {icon.map((d, index) => (
        <path key={index} d={d} />
      ))}
    </svg>
  );
}
