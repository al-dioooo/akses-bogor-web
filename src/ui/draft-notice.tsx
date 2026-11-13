import type { ReactNode } from "react";
import { Icon } from "./icon";
import { IconInfoCircle } from "./icons";

/**
 * Tanda draf di halaman yang isinya belum final: Kebijakan Privasi dan Syarat Layanan (menunggu tinjauan hukum) dan
 * halaman edukasi (menunggu tinjauan komunitas, ADR-0041). Teks biasa, bukan live region, karena tampil sejak awal.
 */
export function DraftNotice({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-start gap-2 rounded-2xl bg-status-partial-bg p-4 font-semibold text-status-partial-fg">
      <Icon icon={IconInfoCircle} className="mt-0.5 size-5" />
      {children}
    </p>
  );
}
