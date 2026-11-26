import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { DashboardHeading } from "@/components/dasbor/dashboard-heading";
import { PlaceHistory } from "@/components/kelola-tempat/place-history";
import { StateDialog } from "@/components/kelola-tempat/state-dialog";
import { NoAccess } from "@/components/verifikasi/no-access";
import { FACILITIES } from "@/lib/api";
import { getAdminPlace, getPlaceHistory } from "@/lib/kelola-tempat";
import { verifierSession } from "@/lib/verifikator";
import { buttonClass } from "@/ui/button-styles";
import { Icon } from "@/ui/icon";
import { IconArrowLeft, IconCircleCheck, IconExternalLink, IconPencil } from "@/ui/icons";
import { LoadErrorBoundary } from "@/ui/load-error";
import { StatusBadge } from "@/ui/status-badge";
import { imageMonth } from "@/lib/verified-label";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("KelolaTempat.place");
  return { title: t("metaTitle") };
}

/** Satu tempat di Kelola tempat (ADR-0051): data, jawaban, foto, keadaan tayang, dan riwayat dari log audit. */
export default async function TempatAdmin({ params, searchParams }: PageProps<"/verifikasi/tempat/[id]">) {
  const t = await getTranslations("KelolaTempat");
  return (
    <>
      <Link href="/verifikasi/tempat" className="-mb-4 inline-flex min-h-11 items-center gap-2 self-start font-semibold underline-offset-4 hover:underline">
        <Icon icon={IconArrowLeft} className="size-5" />
        {t("place.back")}
      </Link>
      <LoadErrorBoundary>
        <Suspense fallback={<p role="status">{t("loading")}</p>}>
          <Sheet params={params} searchParams={searchParams} />
        </Suspense>
      </LoadErrorBoundary>
    </>
  );
}

async function Sheet({ params, searchParams }: { params: PageProps<"/verifikasi/tempat/[id]">["params"]; searchParams: PageProps<"/verifikasi/tempat/[id]">["searchParams"] }) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const saved = query.tersimpan === "1";
  const changed = query.tindakan === "diturunkan" || query.tindakan === "ditayangkan" ? query.tindakan : null;
  const lowered = String(query.belum ?? "")
    .split(",")
    .filter((f): f is (typeof FACILITIES)[number] => (FACILITIES as readonly string[]).includes(f));
  const session = await verifierSession(`/verifikasi/tempat/${id}`);
  if (!session) return <NoAccess />;
  const [t, tk, tf, ta, tr, format] = await Promise.all([
    getTranslations("KelolaTempat"),
    getTranslations("Kategori"),
    getTranslations("Fasilitas"),
    getTranslations("Jawaban"),
    getTranslations("Alasan"),
    getFormatter(),
  ]);
  if (session.user.role !== "admin") return <p className="max-w-prose rounded-2xl bg-bg-sunken p-5">{t("adminOnly")}</p>;
  const [place, history] = await Promise.all([getAdminPlace(session.token, id), getPlaceHistory(session.token, id).catch(() => null)]);
  if (!place) notFound();
  const date = (value: string) => format.dateTime(new Date(value), { dateStyle: "long" });
  const facts: { label: string; value: string }[] = [
    { label: t("place.summary"), value: t("place.summaryValue", { available: place.summary.available, relevant: place.summary.relevant, unknown: place.summary.unknown }) },
    { label: t("place.district"), value: place.district.name },
    { label: t("place.landmark"), value: place.landmark ?? t("place.none") },
    { label: t("place.description"), value: place.description ?? t("place.none") },
    {
      label: t("place.published"),
      value:
        place.verifiedBy === "admin"
          ? t("place.byAdmin", { date: date(place.lastVerifiedAt), name: place.adminPublishedBy ?? t("place.unknownAdmin") })
          : place.verificationSource === "street_view"
            ? t("place.byStreetView", { month: imageMonth(place.streetViewImageDate, format) || "none" })
            : t("place.byTeam", { date: date(place.lastVerifiedAt) }),
    },
  ];
  return (
    <>
      <DashboardHeading id="judul-tempat" label={`${tk(place.category)} · ${place.district.name}`} title={place.name} />
      {saved && (
        <div role="status" className="flex gap-3 rounded-2xl bg-status-accessible-bg p-4 text-status-accessible-fg">
          <Icon icon={IconCircleCheck} className="mt-0.5 size-5 shrink-0" />
          <p>
            <strong className="block">{t("place.saved")}</strong>
            {lowered.length > 0 && <span className="text-text-primary">{t("place.savedUnknown", { facilities: lowered.map((f) => tf(f)).join(", ") })}</span>}
          </p>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={place.status} size="sm" />
        <span className="rounded-full bg-bg-sunken px-3 py-1 text-sm font-bold">
          {t(`origin.${place.verificationSource === "street_view" && place.verifiedBy !== "admin" ? "street_view" : place.verifiedBy}`)}
        </span>
        <span className="rounded-full bg-bg-sunken px-3 py-1 text-sm font-bold">{t(place.published ? "published.ya" : "published.tidak")}</span>
      </div>
      {changed && (
        <p role="status" className="flex gap-3 rounded-2xl bg-bg-sunken p-4">
          <Icon icon={IconCircleCheck} className="mt-0.5 size-5 shrink-0" />
          {t(`place.${changed}`)}
        </p>
      )}
      {!place.published && (
        <p className="rounded-2xl bg-status-inaccessible-bg p-4 text-status-inaccessible-fg">
          {t("place.down", { date: date(place.unpublishedAt!), reason: place.unpublishedReason ?? "" })}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        {place.published && (
          <Link href={`/verifikasi/tempat/${place.id}/ubah`} className={buttonClass("primary", "sm")}>
            <Icon icon={IconPencil} />
            {t("place.edit")}
          </Link>
        )}
        {place.published && (
          <Link href={`/lokasi/${place.id}`} className={buttonClass("outline", "sm")}>
            <Icon icon={IconExternalLink} />
            {t("place.public")}
          </Link>
        )}
        <StateDialog id={place.id} name={place.name} published={place.published} />
      </div>
      <div className="grid items-start gap-8 xl:grid-cols-2">
        <section aria-labelledby="data-tempat" className="panel flex flex-col gap-4 rounded-3xl p-5 sm:p-6">
          <h2 id="data-tempat" className="font-heading text-xl font-bold">
            {t("place.dataTitle")}
          </h2>
          <dl className="flex flex-col gap-3">
            {facts.map((fact) => (
              <div key={fact.label}>
                <dt className="text-sm text-text-secondary">{fact.label}</dt>
                <dd className="font-semibold break-words whitespace-pre-line">{fact.value}</dd>
              </div>
            ))}
          </dl>
        </section>
        <section aria-labelledby="fasilitas-tempat" className="panel flex flex-col gap-4 rounded-3xl p-5 sm:p-6">
          <h2 id="fasilitas-tempat" className="font-heading text-xl font-bold">
            {t("place.facilitiesTitle")}
          </h2>
          <ul className="flex flex-col gap-3">
            {place.facilities.map((f) => (
              <li key={f.facility} className="flex flex-col">
                <span className="font-semibold">{tf(f.facility)}</span>
                <span className="text-text-secondary">
                  {ta(f.answer)}
                  {f.reason ? ` · ${tr(f.reason)}` : ""}
                  {f.note ? ` · ${f.note}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
      <section aria-labelledby="foto-tempat" className="flex flex-col gap-4">
        <h2 id="foto-tempat" className="font-heading text-xl font-bold">
          {t("place.photosTitle", { count: place.photos.length })}
        </h2>
        {place.photos.length > 0 && (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {place.photos.map((photo) => (
              <li key={photo.id} className="flex flex-col gap-1">
                {photo.url ? (
                  // eslint-disable-next-line @next/next/no-img-element -- foto dari bucket publik, ukurannya sudah diperkecil API.
                  <img src={photo.url} alt={photo.alt} className="aspect-[4/3] w-full rounded-2xl object-cover" loading="lazy" />
                ) : (
                  <span className="grid aspect-[4/3] place-items-center rounded-2xl bg-bg-sunken p-3 text-center text-sm text-text-secondary">{photo.alt}</span>
                )}
                {photo.caption && <span className="text-sm text-text-secondary">{photo.caption}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>
      <section aria-labelledby="riwayat-tempat" className="flex flex-col gap-4">
        <h2 id="riwayat-tempat" className="font-heading text-xl font-bold">
          {t("history.title")}
        </h2>
        {history ? <PlaceHistory items={history.items} /> : <p className="rounded-2xl bg-bg-sunken p-5">{t("history.failed")}</p>}
      </section>
    </>
  );
}
