import type { ReactNode } from "react";
import { Icon } from "./icon";
import { IconCheck } from "./icons";

// Kotak centang tak terlihat menutupi seluruh chip, supaya sentuhan dan pembaca layar di ponsel mengenai
// kontrolnya sendiri. Cincin fokus dan tanda centang digambar di label.
const CHOICE =
  "relative inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-2 rounded-full border-2 border-border-subtle bg-surface-raised px-4 text-sm font-semibold " +
  "transition-colors duration-200 hover:border-border-strong has-checked:border-border-strong has-checked:bg-text-primary " +
  "has-checked:text-bg-canvas has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus-ring";

/** Chip pilihan untuk filter GET (kategori, fasilitas, status): kotak centang dengan label berbentuk pil. */
export function ChoiceChip({ name, value, checked, className = "", children }: { name: string; value: string; checked: boolean; className?: string; children: ReactNode }) {
  return (
    <label className={`${CHOICE} ${className}`.trim()}>
      <input
        type="checkbox"
        name={name}
        value={value}
        defaultChecked={checked}
        className="peer absolute inset-0 size-full cursor-pointer appearance-none rounded-full opacity-0"
      />
      <Icon icon={IconCheck} className="hidden size-4 peer-checked:block" />
      {children}
    </label>
  );
}
