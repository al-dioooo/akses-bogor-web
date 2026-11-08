import { useTranslations } from "next-intl";
import type { Review } from "@/lib/verifikasi";
import { FacilityCompare } from "./facility-compare";
import { SheetHeading } from "./parts";
import { PlaceFacts } from "./place-facts";

/**
 * Lembar periksa (FR-31): bagian bernomor mengikuti urutan Panduan Verifikasi bagian 3, dengan daftar bagian yang
 * menempel di samping pada layar lebar.
 */
export function ReviewSheet({ review }: { review: Review }) {
  const t = useTranslations("Pemeriksaan");
  const sections = [
    { id: "tempat", title: t("place.title") },
    { id: "fasilitas", title: t("facilities.title") },
    { id: "deskripsi", title: t("description.title") },
  ];
  return (
    <div className="grid items-start gap-10 lg:grid-cols-[13rem_minmax(0,1fr)]">
      <nav aria-label={t("index")} className="max-lg:hidden lg:sticky lg:top-24">
        <ol className="flex flex-col gap-1 border-l-2 border-border-subtle">
          {sections.map((section, index) => (
            <li key={section.id}>
              <a href={`#${section.id}`} className="-ml-0.5 flex min-h-11 items-center gap-3 border-l-2 border-transparent pl-4 font-semibold hover:border-border-strong">
                <span className="font-mono text-sm text-text-secondary">{index + 1}</span>
                {section.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>
      <div className="flex min-w-0 flex-col gap-12">
        <section id="tempat" aria-labelledby="judul-tempat" className="flex scroll-mt-24 flex-col gap-5">
          <SheetHeading id="judul-tempat" number={1} title={t("place.title")} />
          <PlaceFacts review={review} />
        </section>
        <section id="fasilitas" aria-labelledby="judul-fasilitas" className="flex scroll-mt-24 flex-col gap-5">
          <SheetHeading id="judul-fasilitas" number={2} title={t("facilities.title")}>
            {t("facilities.intro")}
          </SheetHeading>
          <FacilityCompare review={review} />
        </section>
        <section id="deskripsi" aria-labelledby="judul-deskripsi" className="flex scroll-mt-24 flex-col gap-5">
          <SheetHeading id="judul-deskripsi" number={3} title={t("description.title")} />
          <p className="rounded-2xl bg-bg-sunken p-4 break-words whitespace-pre-line">{review.submission.description ?? t("description.empty")}</p>
        </section>
      </div>
    </div>
  );
}
