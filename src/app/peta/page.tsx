import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { MapResults, MapResultsSkeleton } from "@/components/peta/results";
import { SearchBar } from "@/components/peta/search-bar";
import { getDistricts } from "@/lib/api";
import { parseFilters } from "@/lib/filters";
import { LoadErrorBoundary } from "@/ui/load-error";

export function generateMetadata(): Promise<Metadata> {
  return pageMetadata("Peta", "/peta");
}

/**
 * Peta (FR-05) layar penuh: peta di bawah, pencarian, kontrol, dan panel daftar mengambang di atasnya sebagai item grid
 * `main.peta-app` (globals.css). Filter sama dengan Jelajahi dan dibaca dari URL saat request.
 */
export default async function Peta({ searchParams }: PageProps<"/peta">) {
  const t = await getTranslations("Peta");
  return (
    <main id="konten" className="peta-app" data-tinggi="awal">
      <h1 className="sr-only">
        {t("title")} {t("accent")}
      </h1>
      <Suspense fallback={<MapResultsSkeleton label={t("loading")} search />}>
        <MapContent searchParams={searchParams} loading={t("loading")} />
      </Suspense>
    </main>
  );
}

/**
 * Filter baru dimuat lewat navigasi klien tanpa kunci Suspense baru, jadi hasil lama (dan peta yang sama) tetap tampil
 * sampai hasil baru siap. Kotak pencarian menunjukkan bahwa hasil sedang dimuat.
 */
async function MapContent({ searchParams, loading }: { searchParams: PageProps<"/peta">["searchParams"]; loading: string }) {
  const filters = parseFilters(await searchParams);
  const districts = await getDistricts().catch(() => []);
  return (
    <>
      <SearchBar filters={filters} districts={districts} />
      {/* display: contents, supaya isi peta tetap item grid main; pesan galat tampil di atas peta. */}
      <div className="peta-isi contents">
        <LoadErrorBoundary>
          <Suspense fallback={<MapResultsSkeleton label={loading} />}>
            <MapResults filters={filters} />
          </Suspense>
        </LoadErrorBoundary>
      </div>
    </>
  );
}
