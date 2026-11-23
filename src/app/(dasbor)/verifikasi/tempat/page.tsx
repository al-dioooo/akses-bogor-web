import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { DashboardHeading } from "@/components/dasbor/dashboard-heading";
import { Pager, PlaceFilters, PlaceRows } from "@/components/kelola-tempat/place-list";
import { listHref, parseListQuery } from "@/components/kelola-tempat/query";
import { NoAccess } from "@/components/verifikasi/no-access";
import { getDistricts } from "@/lib/api";
import { listAdminPlaces } from "@/lib/kelola-tempat";
import { verifierSession } from "@/lib/verifikator";
import { buttonClass } from "@/ui/button-styles";
import { Icon } from "@/ui/icon";
import { IconCirclePlus } from "@/ui/icons";
import { LoadErrorBoundary } from "@/ui/load-error";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("KelolaTempat");
  return { title: t("metaTitle") };
}

/**
 * Kelola tempat (ADR-0051): semua tempat untuk admin, termasuk yang diturunkan, dengan saringan dan halaman. Halaman ini
 * hanya memilih apa yang ditampilkan; API memeriksa peran admin di setiap route.
 */
export default async function KelolaTempat({ searchParams }: PageProps<"/verifikasi/tempat">) {
  const t = await getTranslations("KelolaTempat");
  return (
    <>
      <DashboardHeading id="judul-kelola" label={t("eyebrow")} title={t("title")} accent={t("accent")} intro={t("intro")} />
      <LoadErrorBoundary>
        <Suspense fallback={<p role="status">{t("loading")}</p>}>
          <Places searchParams={searchParams} />
        </Suspense>
      </LoadErrorBoundary>
    </>
  );
}

async function Places({ searchParams }: { searchParams: PageProps<"/verifikasi/tempat">["searchParams"] }) {
  const { filters, page, query, active } = parseListQuery(await searchParams);
  const session = await verifierSession(listHref(filters, page));
  if (!session) return <NoAccess />;
  const t = await getTranslations("KelolaTempat");
  if (session.user.role !== "admin") return <p className="max-w-prose rounded-2xl bg-bg-sunken p-5">{t("adminOnly")}</p>;
  const [list, districts] = await Promise.all([listAdminPlaces(session.token, query), getDistricts().catch(() => [])]);
  const pages = Math.max(1, Math.ceil(list.total / query.limit!));
  return (
    <>
      <div className="flex flex-wrap gap-3">
        <Link href="/verifikasi/tempat/baru" className={buttonClass("primary", "sm")}>
          <Icon icon={IconCirclePlus} />
          {t("add")}
        </Link>
        <Link href="/verifikasi/tempat/kandidat" className={buttonClass("outline", "sm")}>
          {t("candidates.link")}
        </Link>
      </div>
      <PlaceFilters filters={filters} districts={districts} active={active} />
      <section aria-labelledby="hasil-tempat" className="flex flex-col gap-4">
        <h2 id="hasil-tempat" className="font-heading text-2xl font-bold">
          {t("count", { count: list.total })}
        </h2>
        {list.items.length > 0 ? (
          <PlaceRows items={list.items} />
        ) : list.total > 0 ? (
          <p className="rounded-2xl bg-bg-sunken p-5">
            {t("pageEmpty")}{" "}
            <Link href={listHref(filters)} className="font-semibold text-text-brand underline underline-offset-4">
              {t("firstPage")}
            </Link>
          </p>
        ) : (
          <div className="flex flex-col items-start gap-2 rounded-3xl border-2 border-dashed border-border-subtle p-6">
            <p className="font-heading text-xl font-bold">{t(active ? "emptyTitle" : "noneTitle")}</p>
            <p className="max-w-prose text-text-secondary">{t(active ? "emptyBody" : "noneBody")}</p>
          </div>
        )}
        <Pager filters={filters} page={page} pages={pages} />
      </section>
    </>
  );
}
