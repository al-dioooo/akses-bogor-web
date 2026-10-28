import { useTranslations } from "next-intl";
import type { Answer, PlaceDetail } from "@/lib/api";
import { Icon } from "@/ui/icon";
import { ANSWER_ICON, FACILITY_ICON } from "@/ui/place-icons";

const ANSWER_TONE: Record<Answer, string> = {
  tersedia: "bg-status-accessible-bg text-status-accessible-fg",
  tidak_tersedia: "bg-status-inaccessible-bg text-status-inaccessible-fg",
  tidak_perlu: "bg-surface-brand-subtle text-text-secondary",
  belum_tahu: "bg-status-unknown-bg text-status-unknown-fg",
};

/** Facility item (Detail · DS v1): jawaban, lalu baris alasan dan catatan bila ada (ADR-0017, ADR-0022). */
export function FacilityList({ facilities }: { facilities: PlaceDetail["facilities"] }) {
  const tf = useTranslations("Fasilitas");
  const tj = useTranslations("Jawaban");
  const ta = useTranslations("Alasan");
  return (
    <ul className="flex flex-col gap-3">
      {facilities.map(({ facility, answer, reason, note }) => {
        const detail = [reason ? ta(reason) : null, note].filter(Boolean).join(" · ");
        return (
          <li key={facility} className="glass flex gap-4 rounded-lg p-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-md bg-surface-brand-subtle text-icon-brand">
              <Icon icon={FACILITY_ICON[facility]} className="size-5.5" />
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold">{tf(facility)}</span>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border border-current/25 px-2.5 py-1 text-sm font-semibold ${ANSWER_TONE[answer]}`}
                >
                  <Icon icon={ANSWER_ICON[answer]} className="size-4" />
                  {tj(answer)}
                </span>
              </div>
              {detail && <p className="text-sm text-text-secondary">{detail}</p>}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
