import type { Metadata, Viewport } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { AgenBar } from "@/components/agen/agen-bar";
import { AgenChat } from "@/components/agen/agen-chat";
import { RouteHiddenMarker } from "@/components/agen/route-marker";
import { agentEnabled } from "@/lib/agen-rute";
import { isPlaceId } from "@/lib/agen-rute-isian";
import { getPlace } from "@/lib/api";
import { pageMetadata } from "@/lib/metadata";
import { currentAccount } from "@/lib/sesi";
import { assistantStatus } from "@/lib/tanya-rute";
import { Icon } from "@/ui/icon";
import { IconInfoCircle } from "@/ui/icons";
import { LoadErrorBoundary } from "@/ui/load-error";

export function generateMetadata(): Promise<Metadata> {
  return pageMetadata("Agen", "/agen");
}

/** Keyboard ponsel memperkecil tinggi halaman (Chrome Android), supaya kotak tulis tetap di atasnya. */
export const viewport: Viewport = { width: "device-width", initialScale: 1, interactiveWidget: "resizes-content" };

/**
 * Agen AI (ADR-0054): satu agen obrolan untuk semua pengunjung, setinggi layar (globals.css, `.agen-app`). Judul tampil
 * langsung; status agen, akun, dan tempat dari `?tempat=` dibaca saat request. Selama API belum membuka asisten, halaman
 * hanya memberi tahu bahwa Agen AI belum dibuka.
 */
export default async function AgenPage({ searchParams }: PageProps<"/agen">) {
  const t = await getTranslations("Agen");
  return (
    <main id="konten" className="agen-app">
      <RouteHiddenMarker />
      <LoadErrorBoundary>
        <Suspense
          fallback={
            <>
              <AgenBar title={t("title")} />
              <p role="status" className="agen-kolom py-6 text-text-secondary">
                {t("loading")}
              </p>
            </>
          }
        >
          <Agen searchParams={searchParams} />
        </Suspense>
      </LoadErrorBoundary>
    </main>
  );
}

async function Agen({ searchParams }: { searchParams: PageProps<"/agen">["searchParams"] }) {
  const [status, params, account, t] = await Promise.all([assistantStatus(), searchParams, currentAccount(), getTranslations("Agen")]);
  if (!status?.enabled) {
    return (
      <>
        <AgenBar title={t("title")} />
        <div className="agen-kolom py-6">
          <div className="flex gap-3 rounded-3xl bg-bg-sunken p-5">
            <Icon icon={IconInfoCircle} className="mt-0.5 size-6 shrink-0 text-icon-brand" />
            <p>
              <strong className="block font-heading text-lg">{t("unavailable.title")}</strong>
              {t("unavailable.body")}
            </p>
          </div>
        </div>
      </>
    );
  }
  // Alat kontributor hanya untuk akun yang sudah lengkap selama agen kontributor dibuka; API memeriksanya lagi.
  const contributor = Boolean(account && !account.user.needsCompletion) && (await agentEnabled());
  // Tempat dari "Tanya rute ke sini". Id yang salah, tempat yang tidak ada, atau API yang galat hanya membuat halaman
  // tampil tanpa tempat terpilih.
  const id = typeof params.tempat === "string" && isPlaceId(params.tempat) ? params.tempat : undefined;
  const place = id ? await getPlace(id).catch(() => null) : null;
  return (
    <AgenChat
      questionsPerDay={status.questionsPerDay}
      contributor={contributor}
      signedIn={Boolean(account)}
      place={place ? { id: place.id, name: place.name } : undefined}
    />
  );
}
