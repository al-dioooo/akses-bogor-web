import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { DashboardHeading } from "@/components/dasbor/dashboard-heading";
import { PlaceForm, type CandidateStart } from "@/components/kelola-tempat/place-form";
import { NoAccess } from "@/components/verifikasi/no-access";
import { CATEGORIES } from "@/lib/api";
import { verifierSession } from "@/lib/verifikator";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("KelolaTempat.new");
  return { title: t("metaTitle") };
}

type Params = Record<string, string | string[] | undefined>;
const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";

/** Kandidat OpenStreetMap dari alamat (`osm`, `nama`, `kategori`, `lat`, `lng`), seperti tautan Laporkan dari Peta. */
function candidateFrom(params: Params): CandidateStart | null {
  const [type, id] = one(params.osm).split("/");
  const category = CATEGORIES.find((c) => c === one(params.kategori));
  const lat = Number(one(params.lat));
  const lng = Number(one(params.lng));
  if (!["node", "way", "relation"].includes(type ?? "") || !/^\d+$/.test(id ?? "") || !category || !Number.isFinite(lat) || !Number.isFinite(lng) || !one(params.lat) || !one(params.lng)) return null;
  return { osm: { type: type as CandidateStart["osm"]["type"], id: Number(id) }, name: one(params.nama).slice(0, 120) || null, category, point: { lat, lng } };
}

/** Tambah tempat (ADR-0050): langsung tayang dengan label admin. */
export default async function TambahTempat({ searchParams }: PageProps<"/verifikasi/tempat/baru">) {
  const t = await getTranslations("KelolaTempat.new");
  return (
    <>
      <DashboardHeading id="judul-tambah" label={t("eyebrow")} title={t("title")} accent={t("accent")} intro={t("intro")} />
      <Suspense fallback={<p role="status">{t("loading")}</p>}>
        <Form searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Form({ searchParams }: { searchParams: PageProps<"/verifikasi/tempat/baru">["searchParams"] }) {
  const candidate = candidateFrom(await searchParams);
  const session = await verifierSession("/verifikasi/tempat/baru");
  if (!session) return <NoAccess />;
  const t = await getTranslations("KelolaTempat");
  if (session.user.role !== "admin") return <p className="max-w-prose rounded-2xl bg-bg-sunken p-5">{t("adminOnly")}</p>;
  return (
    <>
      {candidate && <p className="max-w-3xl rounded-2xl bg-surface-brand-subtle p-4">{t("new.fromCandidate")}</p>}
      <PlaceForm place={null} candidate={candidate} />
    </>
  );
}
