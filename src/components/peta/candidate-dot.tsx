/**
 * Bentuk kandidat "Belum ada data" (ADR-0049) di legenda dan kartu: lingkaran berlubang abu-abu, sama dengan lapisan di
 * peta dan berbeda dari keempat marker status. Dekoratif; teksnya selalu ada di sebelahnya.
 */
export function CandidateDot({ className = "size-4" }: { className?: string }) {
  return <span aria-hidden="true" className={`inline-block shrink-0 rounded-full border-[2.5px] border-icon-secondary bg-bg-canvas ${className}`} />;
}
