"use client";

import { useTranslations } from "next-intl";
import { FACILITIES } from "@/lib/api";
import { computeStatus } from "@/lib/status";
import { StatusBadge } from "@/ui/status-badge";
import { finalAnswer, type Decision, type Problem } from "./decision";

/** Pratinjau status dari jawaban yang akan tayang dan kemajuan pemeriksaan (ADR-0018, ADR-0036). */
export function DecisionSummary({ decision, problems, compact = false }: { decision: Decision; problems: Problem[]; compact?: boolean }) {
  const t = useTranslations("Pemeriksaan.result");
  const tf = useTranslations("Fasilitas");
  const preview = computeStatus(FACILITIES.map((facility) => finalAnswer(facility, decision.facilities[facility])));
  const done = FACILITIES.filter((facility) => decision.facilities[facility].evidence).length;
  return (
    <div className="flex flex-col gap-3">
      <p className="lbl text-text-secondary">{t("preview")}</p>
      <StatusBadge status={preview.status} />
      <p className="font-semibold">
        {t("summary", { available: preview.available, relevant: preview.relevant })}
        {preview.unknown > 0 && <span className="font-normal text-text-secondary"> · {t("unknown", { count: preview.unknown })}</span>}
      </p>
      <div className="flex flex-col gap-1.5">
        <p className="text-sm font-semibold">{t("progress", { done })}</p>
        <span aria-hidden="true" className="flex gap-1">
          {FACILITIES.map((facility) => (
            <span key={facility} className={`h-1.5 flex-1 rounded-full ${decision.facilities[facility].evidence ? "bg-brand-fill" : "bg-bg-sunken"}`} />
          ))}
        </span>
      </div>
      {!compact && <p className="text-sm text-text-secondary">{t("previewHint")}</p>}
      {!compact &&
        (problems.length ? (
          <div className="flex flex-col gap-2">
            <p className="font-semibold">{t("problemsTitle")}</p>
            <ul className="flex flex-col gap-1">
              {problems.map((problem) => (
                <li key={`${problem.key}-${problem.facility ?? ""}`}>
                  <a
                    href={`#${problem.target}`}
                    onClick={(event) => {
                      const target = document.getElementById(problem.target);
                      if (!target) return;
                      event.preventDefault();
                      target.focus();
                      target.scrollIntoView?.({ block: "center" });
                    }}
                    className="inline-flex min-h-11 items-center font-semibold underline underline-offset-2"
                  >
                    {t(`problems.${problem.key}`, { facility: problem.facility ? tf(problem.facility) : "" })}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p role="status" className="font-semibold text-status-accessible-fg">
            {t("ready")}
          </p>
        ))}
    </div>
  );
}
