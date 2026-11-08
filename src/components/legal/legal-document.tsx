import { getFormatter, getTranslations } from "next-intl/server";
import { Icon } from "@/ui/icon";
import { IconInfoCircle } from "@/ui/icons";

export type LegalSection = {
  id: string;
  title: string;
  paragraphs?: string[];
  items?: string[];
  after?: string[];
  table?: { caption: string; data: string; period: string; rows: [string, string][] };
};

/**
 * Halaman teks panjang untuk Kebijakan Privasi dan Syarat Layanan (FR-50): judul, versi, tanda draf, daftar isi, lalu
 * bagian-bagiannya. Teksnya salinan dokumen di akses-bogor-docs (product/), dibaca dari `messages/id.json`. Daftar isi
 * menempel di samping mulai layar lebar; di ponsel daftar itu ada di atas teks.
 */
export async function LegalDocument({ namespace, version }: { namespace: "KebijakanPrivasi" | "SyaratLayanan"; version: string }) {
  const [t, format] = await Promise.all([getTranslations(namespace), getFormatter()]);
  const sections = t.raw("sections") as LegalSection[];
  const date = format.dateTime(new Date(`${version}T00:00:00+07:00`), { dateStyle: "long" });
  return (
    <main id="konten" className="page-width flex flex-1 flex-col gap-8 py-10 sm:py-16">
      <div className="flex max-w-3xl flex-col items-start gap-4">
        <p className="lbl">{t("eyebrow")}</p>
        <h1 className="display text-[clamp(2.5rem,1.6rem+3vw,4rem)] leading-none">
          {t("title")}
          <span className="accent"> {t("accent")}</span>
        </h1>
        <p className="font-mono text-sm text-text-secondary">{t("version", { date })}</p>
        <p className="flex items-start gap-2 rounded-2xl bg-status-partial-bg p-4 font-semibold text-status-partial-fg">
          <Icon icon={IconInfoCircle} className="mt-0.5 size-5" />
          {t("draft")}
        </p>
      </div>
      <div className="grid gap-10 lg:grid-cols-[16rem_1fr]">
        <nav aria-labelledby="isi-halaman" className="lg:sticky lg:top-24 lg:self-start">
          <h2 id="isi-halaman" className="lbl mb-3">
            {t("contents")}
          </h2>
          <ol className="flex flex-col gap-1">
            {sections.map((section) => (
              <li key={section.id}>
                <a href={`#${section.id}`} className="inline-flex min-h-11 items-center font-semibold text-text-brand underline-offset-2 hover:underline">
                  {section.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>
        <div className="flex max-w-3xl min-w-0 flex-col gap-10 text-lg">
          {sections.map((section) => (
            <section key={section.id} aria-labelledby={section.id} className="flex scroll-mt-24 flex-col gap-4">
              <h2 id={section.id} className="font-heading text-2xl font-bold">
                {section.title}
              </h2>
              {section.paragraphs?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              {section.items && (
                <ul className="flex list-disc flex-col gap-2 pl-6">
                  {section.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
              {section.after?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              {section.table && <RetentionTable table={section.table} />}
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}

function RetentionTable({ table }: { table: NonNullable<LegalSection["table"]> }) {
  return (
    <div className="rounded-2xl border border-border-subtle">
      <table className="w-full text-left text-base">
        <caption className="sr-only">{table.caption}</caption>
        <thead className="bg-bg-sunken">
          <tr>
            <th scope="col" className="p-4">
              {table.data}
            </th>
            <th scope="col" className="p-4">
              {table.period}
            </th>
          </tr>
        </thead>
        <tbody>
          {table.rows.map(([data, period]) => (
            <tr key={data} className="border-t border-border-subtle">
              <th scope="row" className="p-4 font-semibold">
                {data}
              </th>
              <td className="p-4">{period}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
