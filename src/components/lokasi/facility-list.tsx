import Image from "next/image";
import { useTranslations } from "next-intl";
import type { Answer, PlaceDetail } from "@/lib/api";
import { Icon } from "@/ui/icon";
import { ANSWER_ICON } from "@/ui/place-icons";
import { ROUTE, routeNumber } from "../rute";

const ANSWER_TONE: Record<Answer, string> = {
  tersedia: "bg-status-accessible-bg text-status-accessible-fg",
  tidak_tersedia: "bg-status-inaccessible-bg text-status-inaccessible-fg",
  tidak_perlu: "bg-surface-brand-subtle text-text-secondary",
  belum_tahu: "bg-status-unknown-bg text-status-unknown-fg",
};

/**
 * Fasilitas sebagai rute ke pintu (ADR-0027): close-up yang sama dengan Beranda, jawaban tempat ini, lalu
 * alasan dan catatan bila ada (ADR-0017, ADR-0022). Gambar fasilitas yang belum bisa dipakai diredupkan.
 */
export function FacilityList({ facilities }: { facilities: PlaceDetail["facilities"] }) {
  const tf = useTranslations("Fasilitas");
  const tj = useTranslations("Jawaban");
  const ta = useTranslations("Alasan");
  const tr = useTranslations("Rute");
  const answers = new Map(facilities.map((item) => [item.facility, item]));
  return (
    <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {ROUTE.map(({ facility, image }, index) => {
        const item = answers.get(facility);
        if (!item) return null;
        const detail = [item.reason ? ta(item.reason) : null, item.note].filter(Boolean).join(" · ");
        return (
          <li
            key={facility}
            className={`flex flex-col overflow-hidden rounded-3xl border border-border-subtle bg-surface-raised ${item.answer === "tidak_tersedia" ? "ring-3 ring-status-inaccessible-bg" : ""}`}
          >
            <span className="relative block aspect-square border-b border-border-subtle">
              <Image
                src={image}
                alt=""
                placeholder="blur"
                sizes="(min-width: 64rem) 18rem, (min-width: 40rem) 50vw, 100vw"
                className={`size-full object-cover ${item.answer === "tersedia" ? "" : "[filter:saturate(.35)_brightness(1.04)]"}`}
              />
              <span
                aria-hidden="true"
                className="absolute top-3.5 left-3.5 grid size-11 place-items-center rounded-full border-3 border-brand-fill bg-surface-raised font-mono text-sm font-semibold text-text-brand"
              >
                {routeNumber(index)}
              </span>
            </span>
            <div className="flex flex-1 flex-col items-start gap-2.5 p-5">
              <p className="font-mono text-xs font-medium tracking-[0.08em] text-text-secondary uppercase">{tr(`where.${facility}`)}</p>
              <h3 className="font-heading text-[1.375rem] leading-tight font-bold tracking-[-0.02em]">{tf(facility)}</h3>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-bold ${ANSWER_TONE[item.answer]}`}>
                <Icon icon={ANSWER_ICON[item.answer]} className="size-4" />
                {tj(item.answer)}
              </span>
              {detail && <p className="text-sm text-text-secondary">{detail}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
