import type { ReactNode } from "react";
import { Icon } from "@/ui/icon";
import type { Glyph } from "@/ui/icons";

/** Keadaan kosong di meja verifikasi, dengan tindakan opsional di bawahnya. */
export function Empty({ icon, title, body, children }: { icon: Glyph; title: string; body: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-3xl border-2 border-dashed border-border-subtle p-6 sm:p-8">
      <Icon icon={icon} className="size-7 text-icon-brand" />
      <p className="font-heading text-xl font-bold">{title}</p>
      <p className="max-w-prose text-text-secondary">{body}</p>
      {children}
    </div>
  );
}
