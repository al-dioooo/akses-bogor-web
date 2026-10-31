import { useTranslations } from "next-intl";
import type { Status } from "@/lib/api";
import { Icon } from "./icon";
import { STATUS_ICON, STATUS_TONE } from "./place-icons";

/** Status badge: warna, ikon, dan teks selalu bersama, tidak pernah warna saja (ADR-0027). */
export function StatusBadge({ status, size = "md" }: { status: Status; size?: "sm" | "md" }) {
  const t = useTranslations("Status");
  const sizing = size === "sm" ? "gap-1 px-2.5 py-1 text-sm" : "gap-1.5 px-3 py-1.5 text-sm";
  return (
    <span
      className={`inline-flex items-center rounded-full font-bold ${STATUS_TONE[status]} ${sizing}`}
    >
      <Icon icon={STATUS_ICON[status]} className={size === "sm" ? "size-4" : "size-4.5"} />
      {t(status)}
    </span>
  );
}
