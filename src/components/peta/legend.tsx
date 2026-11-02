import { useTranslations } from "next-intl";
import { STATUSES } from "@/lib/api";
import { StatusPin } from "@/ui/status-pin";

/** Legenda marker (FR-05): bentuk yang sama dengan marker di peta, ditambah label teks setiap status. */
export function MapLegend() {
  const t = useTranslations("Peta");
  const ts = useTranslations("Status");
  return (
    <section aria-labelledby="judul-legenda" className="flex flex-col gap-3">
      <h2 id="judul-legenda" className="font-heading text-lg font-bold">
        {t("legend")}
      </h2>
      <ul className="flex flex-wrap gap-x-6 gap-y-3">
        {STATUSES.map((status) => (
          <li key={status} className="flex items-center gap-2.5 font-semibold">
            <StatusPin status={status} className="size-7" />
            {ts(status)}
          </li>
        ))}
      </ul>
    </section>
  );
}
