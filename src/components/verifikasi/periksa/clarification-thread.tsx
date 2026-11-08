import { useFormatter, useTranslations } from "next-intl";
import type { Clarification } from "@/lib/verifikasi";

/** Pertanyaan verifikator dan jawaban pelapor, berurutan (ADR-0036). */
export function ClarificationThread({ items }: { items: Clarification[] }) {
  const t = useTranslations("Pemeriksaan.clarifications");
  const format = useFormatter();
  const date = (value: string) => format.dateTime(new Date(value), { dateStyle: "long", timeStyle: "short" });
  return (
    <ol className="flex flex-col gap-3">
      {items.map((item) => (
        <li key={item.id} className="flex flex-col gap-3 rounded-3xl border-2 border-border-subtle p-4 sm:p-5">
          <div className="flex flex-col gap-1">
            <p className="lbl text-text-secondary">
              {t("question")} · {t("asked", { date: date(item.askedAt) })}
            </p>
            <p className="break-words whitespace-pre-line">{item.question}</p>
          </div>
          {item.answer ? (
            <div className="flex flex-col gap-1 rounded-2xl bg-status-accessible-bg p-3 text-status-accessible-fg">
              <p className="lbl">
                {t("answer")} · {t("answered", { date: date(item.answeredAt!) })}
              </p>
              <p className="break-words whitespace-pre-line text-text-primary">{item.answer}</p>
            </div>
          ) : (
            <p className="text-text-secondary">{t("waiting", { date: date(item.dueAt) })}</p>
          )}
        </li>
      ))}
    </ol>
  );
}
