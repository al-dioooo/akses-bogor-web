import { useTranslations } from "next-intl";
import { CATEGORIES, STATUSES } from "@/lib/api";
import { buttonClass } from "@/ui/button-styles";
import { Icon } from "@/ui/icon";
import { CategoryPin } from "@/ui/category-pin";
import { IconCheck } from "@/ui/icons";
import { PlacePin } from "@/ui/place-pin";
import { StatusPin } from "@/ui/status-pin";
import { CandidateDot } from "./candidate-dot";

/**
 * Legenda marker (FR-05): bentuk yang sama dengan marker di peta, ditambah label teks setiap status. Selama ada kandidat
 * "Belum ada data" (ADR-0049), bentuknya ikut di legenda, terpisah dari status, bersama tombol lapisannya. Selama batas
 * Kota Bogor tampil (ADR-0053), garisnya juga dijelaskan.
 */
export function MapLegend({ candidates, border = false }: { candidates?: { on: boolean; onToggle: () => void }; border?: boolean }) {
  const t = useTranslations("Peta");
  const ts = useTranslations("Status");
  return (
    <section aria-labelledby="judul-legenda" className="flex flex-col gap-2">
      <h3 id="judul-legenda" className="lbl">
        {t("legend")}
      </h3>
      {/* Bagian marker: warna dan lencana untuk status, ikon di tengah untuk kategori (ADR-0053). */}
      <p className="flex items-center gap-3 text-sm text-text-secondary">
        <PlacePin place={{ status: "aksesibel", category: "masjid" }} className="size-8" />
        <span>{t("legendMarker")}</span>
      </p>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-2">
        {STATUSES.map((status) => (
          <li key={status} className="flex items-center gap-2 text-sm font-semibold">
            <StatusPin status={status} className="size-6" />
            {ts(status)}
          </li>
        ))}
      </ul>
      {border && (
        <p className="flex items-center gap-2 text-sm font-semibold">
          <BorderLine />
          {t("border")}
        </p>
      )}
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

/**
 * Legenda kategori (issue #199): lencana yang sama dengan di marker, dengan nama kategorinya. Warna kategori selalu
 * berpasangan dengan ikon, dan status tetap ditandai warna serta ikon status.
 */
export function CategoryLegend() {
  const t = useTranslations("Peta");
  const tk = useTranslations("Kategori");
  return (
    <section aria-labelledby="judul-legenda-kategori" className="flex flex-col gap-2">
      <h3 id="judul-legenda-kategori" className="lbl">
        {t("legendCategory")}
      </h3>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-2">
        {CATEGORIES.map((category) => (
          <li key={category} className="flex items-center gap-2 text-sm font-semibold">
            <CategoryPin category={category} className="size-6" />
            {tk(category)}
          </li>
        ))}
      </ul>
      <p className="text-sm text-text-secondary">{t("legendCategoryHint")}</p>
    </section>
  );
}

/** Contoh garis batas Kota Bogor: putus-putus berwarna teks di atas halo berwarna latar, seperti di peta. */
function BorderLine() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 8" className="h-2 w-6 shrink-0 overflow-visible">
      <line x1="0" y1="4" x2="24" y2="4" stroke="var(--color-bg-canvas)" strokeWidth="6" />
      <line x1="0" y1="4" x2="24" y2="4" stroke="var(--color-text-primary)" strokeWidth="2.5" strokeDasharray="5 3.75" />
    </svg>
  );
}
