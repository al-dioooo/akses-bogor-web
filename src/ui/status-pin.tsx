import type { Status } from "@/lib/api";
import { Icon } from "./icon";
import { STATUS_ICON } from "./place-icons";

/** Warna isi marker per status, dengan warna ikon pasangannya (ADR-0027). */
const STATUS_SOLID: Record<Status, string> = {
  aksesibel: "bg-status-accessible-solid text-status-accessible-on-solid",
  sebagian: "bg-status-partial-solid text-status-partial-on-solid",
  tidak_aksesibel: "bg-status-inaccessible-solid text-status-inaccessible-on-solid",
  belum_diketahui: "bg-status-unknown-solid text-status-unknown-on-solid",
};

/**
 * Bentuk Map marker: lingkaran berwarna status dengan ikon status, cincin putih, dan garis luar tipis supaya tetap
 * terpisah dari peta terang maupun gelap. Dekoratif: nama status ditulis di teks sebelahnya atau di nama tombol.
 */
export function StatusPin({ status, className = "size-8" }: { status: Status; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center rounded-full border-2 border-marker-ring shadow-[0_0_0_1px_var(--color-border-strong)] ${STATUS_SOLID[status]} ${className}`}
    >
      <Icon icon={STATUS_ICON[status]} className="size-[62%]" />
    </span>
  );
}
