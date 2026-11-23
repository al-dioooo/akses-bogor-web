import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { DashboardHeading } from "@/components/dasbor/dashboard-heading";
import { PlaceForm } from "@/components/kelola-tempat/place-form";
import { NoAccess } from "@/components/verifikasi/no-access";
import { getAdminPlace } from "@/lib/kelola-tempat";
import { verifierSession } from "@/lib/verifikator";
import { Icon } from "@/ui/icon";
import { IconArrowLeft } from "@/ui/icons";
import { LoadErrorBoundary } from "@/ui/load-error";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("KelolaTempat.edit");
  return { title: t("metaTitle") };
}

/** Ubah tempat (ADR-0050): data baru langsung tayang, dan tempat berlabel admin. */
export default async function UbahTempat({ params }: PageProps<"/verifikasi/tempat/[id]/ubah">) {
  const t = await getTranslations("KelolaTempat");
  return (
    <LoadErrorBoundary>
      <Suspense fallback={<p role="status">{t("loading")}</p>}>
        <Form params={params} />
      </Suspense>
    </LoadErrorBoundary>
  );
}

async function Form({ params }: { params: PageProps<"/verifikasi/tempat/[id]/ubah">["params"] }) {
  const { id } = await params;
  const session = await verifierSession(`/verifikasi/tempat/${id}/ubah`);
  if (!session) return <NoAccess />;
  const t = await getTranslations("KelolaTempat");
  if (session.user.role !== "admin") return <p className="max-w-prose rounded-2xl bg-bg-sunken p-5">{t("adminOnly")}</p>;
  const place = await getAdminPlace(session.token, id);
  if (!place) notFound();
  return (
    <>
      <Link href={`/verifikasi/tempat/${id}`} className="-mb-4 inline-flex min-h-11 items-center gap-2 self-start font-semibold underline-offset-4 hover:underline">
        <Icon icon={IconArrowLeft} className="size-5" />
        {t("edit.back", { name: place.name })}
      </Link>
      <DashboardHeading id="judul-ubah" label={t("edit.eyebrow")} title={t("edit.title")} accent={place.name} intro={t("edit.intro")} />
      {place.published ? <PlaceForm place={place} candidate={null} /> : <p className="max-w-prose rounded-2xl bg-bg-sunken p-5">{t("edit.unpublished")}</p>}
    </>
  );
}
