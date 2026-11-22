import { useTranslations } from "next-intl";
import { STATUSES } from "@/lib/api";
import { StatusPin } from "@/ui/status-pin";

/** Legenda marker (FR-05): bentuk yang sama dengan marker di peta, ditambah label teks setiap status. */
export function MapLegend() {
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
    </section>
  );
}
