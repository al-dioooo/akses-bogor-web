"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import type { RefObject } from "react";
import { candidateReportHref, knownWheelchair, osmUrl } from "@/lib/kandidat";
import { ProviderHints } from "@/components/petunjuk/provider-hints";
import { buttonClass } from "@/ui/button-styles";
import { Icon } from "@/ui/icon";
import { IconMessageReport, IconX } from "@/ui/icons";
import { CATEGORY_ICON } from "@/ui/place-icons";
import { CandidateDot } from "./candidate-dot";
import type { MapCandidate } from "./places";

/**
 * Kartu kandidat "Belum ada data" (ADR-0049) di panel daftar: tempat dari OpenStreetMap yang belum diperiksa tim, jadi
 * tanpa status dan tanpa ringkasan fasilitas. Tag wheelchair OSM hanya disebut sebagai keterangan OSM. Ajakan utamanya
 * Laporkan tempat ini. Judulnya menerima fokus saat kandidat dipilih.
 */
export function CandidateSummary({ candidate, headingRef, onClose }: { candidate: MapCandidate; headingRef: RefObject<HTMLHeadingElement | null>; onClose: () => void }) {
  const t = useTranslations("Peta");
  const tk = useTranslations("Kategori");
  const { wheelchair } = candidate;
  return (
    <section aria-labelledby="judul-ringkasan" className="relative flex flex-col items-start gap-3 px-5 pt-1 pb-5">
      <p className="inline-flex flex-wrap items-center gap-x-1.5 pr-12 text-sm font-semibold">
        <Icon icon={CATEGORY_ICON[candidate.category]} className="size-4.5 text-icon-brand" />
        {tk(candidate.category)}
        <span className="font-normal text-text-secondary">· {candidate.district}</span>
      </p>
      <h3 id="judul-ringkasan" ref={headingRef} tabIndex={-1} className="pr-12 font-heading text-2xl leading-tight font-bold">
        {candidate.name ?? t("kandidat.unnamed", { category: tk(candidate.category) })}
      </h3>
      <p className="inline-flex items-center gap-2 rounded-full border-2 border-dashed border-border-strong px-3 py-1 text-sm font-bold">
        <CandidateDot />
        {t("kandidat.noData")}
      </p>
      <p className="text-text-secondary">{t("kandidat.body")}</p>
      {wheelchair && (
        <p className="rounded-xl bg-bg-sunken px-3 py-2 text-sm">
          {t("kandidat.osmSays", { value: knownWheelchair(wheelchair) ? t(`kandidat.wheelchair.${wheelchair}`) : t("kandidat.wheelchair.other", { value: wheelchair }) })}
        </p>
      )}
      <div className="flex flex-wrap gap-2 pt-1">
        <Link href={candidateReportHref(candidate)} className={buttonClass("primary", "sm")}>
          <Icon icon={IconMessageReport} />
          {t("kandidat.report")}
        </Link>
        <a href={osmUrl(candidate)} target="_blank" rel="noopener noreferrer" className={buttonClass("outline", "sm")}>
          {t("kandidat.osmLink")}
          <span className="sr-only"> {t("kandidat.newTab")}</span>
        </a>
      </div>
      {/* Kandidat tanpa nama tidak bisa dicocokkan dengan tempat penyedia (ADR-0052). */}
      {candidate.name && <ProviderHints source={{ osm: candidate.id }} level={4} delay={400} />}
      <button
        type="button"
        onClick={onClose}
        aria-label={t("summary.close")}
        className="absolute top-0 right-3 grid size-11 place-items-center rounded-full border-2 border-border-subtle hover:border-border-strong hover:bg-surface-hover"
      >
        <Icon icon={IconX} />
      </button>
    </section>
  );
}
