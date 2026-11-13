import { useTranslations } from "next-intl";
import type { Answer, Reason } from "@/lib/api";
import { Icon } from "@/ui/icon";
import { ANSWER_ICON } from "@/ui/place-icons";

const ANSWER_TONE: Record<Answer, string> = {
  tersedia: "bg-status-accessible-bg text-status-accessible-fg",
  tidak_tersedia: "bg-status-inaccessible-bg text-status-inaccessible-fg",
  tidak_perlu: "bg-surface-brand-subtle text-text-secondary",
  belum_tahu: "bg-status-unknown-bg text-status-unknown-fg",
};

/** Jawaban fasilitas sebagai teks, ikon, dan warna, dengan alasan dan catatan di bawahnya (ADR-0017, ADR-0022). */
export function AnswerChip({ answer, reason, note }: { answer: Answer; reason?: Reason | null; note?: string | null }) {
  const tj = useTranslations("Jawaban");
  const ta = useTranslations("Alasan");
  return (
    <span className="flex flex-col items-start gap-1">
      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-bold ${ANSWER_TONE[answer]}`}>
        <Icon icon={ANSWER_ICON[answer]} className="size-4" />
        {tj(answer)}
        {reason && <span className="font-semibold"> · {ta(reason)}</span>}
      </span>
      {note && <span className="text-sm break-words text-text-secondary">“{note}”</span>}
    </span>
  );
}

/** Penanda berubah atau sama, dengan teks, bukan warna saja. */
export function ChangeMark({ changed }: { changed: boolean }) {
  const t = useTranslations("Pemeriksaan.compare");
  return (
    <span className={`lbl rounded-full px-2 py-0.5 ${changed ? "bg-status-partial-bg text-status-partial-fg" : "text-text-secondary"}`}>
      {changed ? t("changed") : t("same")}
    </span>
  );
}

/** Kepala bagian bernomor di lembar periksa. */
export function SheetHeading({ id, number, title, children }: { id: string; number: number; title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <h2 id={id} className="flex items-center gap-3 font-heading text-2xl font-bold">
        <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-full border-2 border-border-strong font-mono text-sm">
          {number}
        </span>
        {title}
      </h2>
      {children && <div className="text-text-secondary">{children}</div>}
    </div>
  );
}
