import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { DashboardHeading } from "@/components/dasbor/dashboard-heading";
import { NoAccess } from "@/components/verifikasi/no-access";
import { CATEGORIES, getDistricts } from "@/lib/api";
import { knownWheelchair, osmUrl } from "@/lib/kandidat";
import { listCandidates, type Candidate } from "@/lib/kelola-tempat";
import { verifierSession } from "@/lib/verifikator";
import { buttonClass } from "@/ui/button-styles";
import { Icon } from "@/ui/icon";
import { IconArrowLeft, IconArrowRight, IconCirclePlus, IconExternalLink, IconSearch } from "@/ui/icons";
import { LoadErrorBoundary } from "@/ui/load-error";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("KelolaTempat.candidates");
  return { title: t("metaTitle") };
}

const PAGE_SIZE = 25;
type Params = Record<string, string | string[] | undefined>;
const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)?.trim() || undefined;
const select = "min-h-12 w-full rounded-2xl border-2 border-border-field bg-surface-field px-4 text-text-primary";

/** Alamat formulir tambah yang terisi dari kandidat, sama dengan parameter tautan Laporkan dari Peta (ADR-0049). */
const createHref = (c: Candidate) => {
  const params = new URLSearchParams({ osm: `${c.osmType}/${c.osmId}`, kategori: c.category, lat: c.location.lat.toFixed(6), lng: c.location.lng.toFixed(6) });
  if (c.name) params.set("nama", c.name);
  return `/verifikasi/tempat/baru?${params}`;
};

/** Kandidat OpenStreetMap untuk dibuat menjadi tempat oleh admin (ADR-0049, ADR-0051). */
export default async function Kandidat({ searchParams }: PageProps<"/verifikasi/tempat/kandidat">) {
  const t = await getTranslations("KelolaTempat.candidates");
  return (
    <>
      <Link href="/verifikasi/tempat" className="-mb-4 inline-flex min-h-11 items-center gap-2 self-start font-semibold underline-offset-4 hover:underline">
        <Icon icon={IconArrowLeft} className="size-5" />
        {t("back")}
      </Link>
      <DashboardHeading id="judul-kandidat" label={t("eyebrow")} title={t("title")} accent={t("accent")} intro={t("intro")} />
      <LoadErrorBoundary>
        <Suspense fallback={<p role="status">{t("count", { count: 0 })}</p>}>
          <List searchParams={searchParams} />
        </Suspense>
      </LoadErrorBoundary>
    </>
  );
}

async function List({ searchParams }: { searchParams: PageProps<"/verifikasi/tempat/kandidat">["searchParams"] }) {
  const params: Params = await searchParams;
  const session = await verifierSession("/verifikasi/tempat/kandidat");
  if (!session) return <NoAccess />;
  const [t, tf, tk, tp] = await Promise.all([getTranslations("KelolaTempat.candidates"), getTranslations("KelolaTempat.filters"), getTranslations("Kategori"), getTranslations("Peta.kandidat")]);
  if (session.user.role !== "admin") return <p className="max-w-prose rounded-2xl bg-bg-sunken p-5">{(await getTranslations("KelolaTempat"))("adminOnly")}</p>;
  const q = one(params.q)?.slice(0, 80);
  const category = CATEGORIES.find((c) => c === one(params.kategori));
  const district = one(params.kecamatan)?.slice(0, 40);
  const page = Math.max(1, Math.floor(Number(one(params.halaman)) || 1));
  const [list, districts] = await Promise.all([listCandidates(session.token, { q, category, district, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }), getDistricts().catch(() => [])]);
  const pages = Math.max(1, Math.ceil(list.total / PAGE_SIZE));
  const pageHref = (n: number) => {
    const next = new URLSearchParams();
    if (q) next.set("q", q);
    if (category) next.set("kategori", category);
    if (district) next.set("kecamatan", district);
    if (n > 1) next.set("halaman", String(n));
    return `/verifikasi/tempat/kandidat${next.size ? `?${next}` : ""}`;
  };
  return (
    <>
      <form method="get" action="/verifikasi/tempat/kandidat" role="search" aria-label={tf("label")} className="panel grid gap-4 rounded-3xl p-4 sm:grid-cols-3 sm:p-5">
        <div className="flex flex-col gap-2">
          <label htmlFor="cari-kandidat" className="font-semibold">
            {tf("search")}
          </label>
          <input id="cari-kandidat" name="q" type="search" defaultValue={q ?? ""} maxLength={80} className={select} />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="kandidat-kategori" className="font-semibold">
            {tf("category")}
          </label>
          <select id="kandidat-kategori" name="kategori" defaultValue={category ?? ""} className={select}>
            <option value="">{tf("allCategories")}</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {tk(c)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="kandidat-kecamatan" className="font-semibold">
            {tf("district")}
          </label>
          <select id="kandidat-kecamatan" name="kecamatan" defaultValue={district ?? ""} className={select}>
            <option value="">{tf("allDistricts")}</option>
            {districts.map((d) => (
              <option key={d.slug} value={d.slug}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <button className={buttonClass("ink", "sm", "self-start sm:col-span-3")}>
          <Icon icon={IconSearch} />
          {tf("apply")}
        </button>
      </form>
      <section aria-labelledby="hasil-kandidat" className="flex flex-col gap-4">
        <h2 id="hasil-kandidat" className="font-heading text-2xl font-bold">
          {t("count", { count: list.total })}
        </h2>
        {list.items.length === 0 ? (
          <p className="rounded-2xl bg-bg-sunken p-5">{t("empty")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {list.items.map((c) => {
              const name = c.name ?? t("unnamed", { category: tk(c.category) });
              return (
                <li key={`${c.osmType}/${c.osmId}`} className="panel flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <h3 className="font-heading text-lg font-bold break-words">{name}</h3>
                    <p className="text-sm text-text-secondary">
                      {tk(c.category)} · {c.district.name}
                    </p>
                    {c.wheelchair && (
                      <p className="text-sm text-text-secondary">{tp("osmSays", { value: knownWheelchair(c.wheelchair) ? tp(`wheelchair.${c.wheelchair}`) : tp("wheelchair.other", { value: c.wheelchair }) })}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link href={createHref(c)} aria-label={t("createLabel", { name })} className={buttonClass("primary", "sm")}>
                      <Icon icon={IconCirclePlus} />
                      {t("create")}
                    </Link>
                    <a href={osmUrl(c)} target="_blank" rel="noopener noreferrer" aria-label={t("osmLabel", { name })} className={buttonClass("ghost", "sm")}>
                      <Icon icon={IconExternalLink} />
                      {t("osm")}
                    </a>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {pages > 1 && (
          <nav aria-label={t("count", { count: list.total })} className="flex flex-wrap justify-between gap-3">
            {page > 1 ? (
              <Link href={pageHref(page - 1)} className={buttonClass("outline", "sm")}>
                <Icon icon={IconArrowLeft} />
                {(await getTranslations("KelolaTempat.pager"))("previous")}
              </Link>
            ) : (
              <span />
            )}
            {page < pages && (
              <Link href={pageHref(page + 1)} className={buttonClass("outline", "sm")}>
                {(await getTranslations("KelolaTempat.pager"))("next")}
                <Icon icon={IconArrowRight} />
              </Link>
            )}
          </nav>
        )}
        <p className="text-sm text-text-secondary">{t("attribution")}</p>
      </section>
    </>
  );
}
