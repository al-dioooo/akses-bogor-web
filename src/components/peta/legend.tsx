import { useTranslations } from "next-intl";
import { STATUSES } from "@/lib/api";
import { buttonClass } from "@/ui/button-styles";
import { Icon } from "@/ui/icon";
import { IconCheck } from "@/ui/icons";
import { StatusPin } from "@/ui/status-pin";
import { CandidateDot } from "./candidate-dot";

/**
 * Legenda marker (FR-05): bentuk yang sama dengan marker di peta, ditambah label teks setiap status. Selama ada kandidat
 * "Belum ada data" (ADR-0049), bentuknya ikut di legenda, terpisah dari status, bersama tombol lapisannya.
 */
export function MapLegend({ candidates }: { candidates?: { on: boolean; onToggle: () => void } }) {
  const t = useTranslations("Peta");
  const ts = useTranslations("Status");
  return (
    <section aria-labelledby="judul-legenda" className="flex flex-col gap-2">
      <h3 id="judul-legenda" className="lbl">
        {t("legend")}
      </h3>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-2">
        {STATUSES.map((status) => (
          <li key={status} className="flex items-center gap-2 text-sm font-semibold">
            <StatusPin status={status} className="size-6" />
            {ts(status)}
          </li>
        ))}
      </ul>
      {candidates && (
        <div className="mt-1 flex flex-col items-start gap-2 border-t border-border-subtle pt-3">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <span className="grid size-6 shrink-0 place-items-center">
              <CandidateDot />
            </span>
            {t("kandidat.legend")}
          </p>
          <button type="button" aria-pressed={candidates.on} onClick={candidates.onToggle} className={buttonClass(candidates.on ? "ink" : "outline", "sm")}>
            {candidates.on && <Icon icon={IconCheck} />}
            {t("kandidat.layer")}
          </button>
        </div>
      )}
    </section>
  );
}
