"use client";

import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { verifiedLabel } from "@/lib/verified-label";
import type { AgenCard } from "@/lib/agen";
import type { CardTarget } from "@/lib/agen-rute";
import type { LatLng } from "@/lib/laporan";
import { PriorityTable } from "@/components/prioritas/priority-table";
import { RouteCard, type RouteEndpoints } from "@/components/rute-jalan-kaki/route-card";
import type { StartPointCopy } from "@/components/rute-jalan-kaki/start-point";
import { buttonClass } from "@/ui/button-styles";
import { Icon } from "@/ui/icon";
import { IconExternalLink, IconHelpCircle, IconPencil } from "@/ui/icons";
import { CATEGORY_ICON } from "@/ui/place-icons";
import { StatusBadge } from "@/ui/status-badge";

type PlaceCard = Extract<AgenCard, { type: "tempat" }>;

/**
 * Rute dan hambatan untuk kartu rute Agen AI: route handler yang juga melayani pengunjung tanpa akun (ADR-0050). Isi
 * kartu rute dan cara memuat rutenya milik `components/rute-jalan-kaki`.
 */
export const AGEN_ENDPOINTS: RouteEndpoints = { route: "/tanya-rute/rute", obstacles: "/tanya-rute/hambatan" };

const cardClass = "flex flex-col items-start gap-3 rounded-3xl border-2 border-border-subtle bg-surface-raised p-4 sm:p-5";

/** Laporan baru dari tempat OpenStreetMap tanpa data AksesBogor (ADR-0049). */
function reportHref(target: Extract<CardTarget, { kind: "osm" }>, name: string | null) {
  const params = new URLSearchParams({ osm: `${target.osmType}/${target.osmId}` });
  if (name) params.set("nama", name);
  return `/laporkan?${params}`;
}

/** Tanda "Belum ada data" untuk tempat OpenStreetMap: teks, ikon, dan warna status belum diketahui. */
function NoData() {
  const t = useTranslations("Agen.kartu");
  return (
    <p className="inline-flex items-center gap-1.5 rounded-full bg-status-unknown-bg px-2.5 py-1 text-sm font-bold text-status-unknown-fg">
      <Icon icon={IconHelpCircle} className="size-4" />
      {t("noData")}
    </p>
  );
}

/** Kartu tempat: lokasi AksesBogor dengan status, atau tempat OpenStreetMap yang belum punya data, dengan Laporkan. */
function Place({ card }: { card: PlaceCard }) {
  const t = useTranslations("Agen.kartu");
  const tk = useTranslations("Kategori");
  const format = useFormatter();
  const name = card.name ?? t("unnamed");
  const verified = "lastVerifiedAt" in card ? verifiedLabel(card, format, "long") : null;
  return (
    <article aria-label={name} className={cardClass}>
      <p className="lbl flex items-center gap-2">
        <Icon icon={CATEGORY_ICON[card.category]} className="size-4" />
        {tk(card.category)} · {card.district.name}
      </p>
      <h3 className="font-heading text-xl font-bold">{name}</h3>
      {card.target.kind === "aksesbogor" && "status" in card ? (
        <>
          <StatusBadge status={card.status} size="sm" />
          <p className="text-sm text-text-secondary">
            {verified && t(verified.key, verified.values)}
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href={`/lokasi/${card.target.placeId}`} className={buttonClass("outline", "sm")}>
              {t("detail")}
            </Link>
            <Link href={`/laporkan?lokasi=${card.target.placeId}`} className={buttonClass("ghost", "sm")}>
              <Icon icon={IconPencil} />
              {t("update")}
            </Link>
          </div>
        </>
      ) : (
        card.target.kind === "osm" &&
        "osmUrl" in card && (
          <>
            <NoData />
            <div className="flex flex-wrap gap-2">
              <Link href={reportHref(card.target, card.name)} className={buttonClass("outline", "sm")}>
                <Icon icon={IconPencil} />
                {t("report")}
              </Link>
              <a href={card.osmUrl} target="_blank" rel="noopener noreferrer" className={buttonClass("ghost", "sm")}>
                {t("osmLink")}
                <Icon icon={IconExternalLink} className="size-4" />
              </a>
            </div>
            <p className="text-sm text-text-secondary">{card.attribution}</p>
          </>
        )
      )}
    </article>
  );
}

/** Keterangan di atas kartu rute ke tempat OpenStreetMap yang tidak punya kartu tempat di jawaban yang sama. */
function CandidateNote({ target, name }: { target: Extract<CardTarget, { kind: "osm" }>; name: string | null }) {
  const t = useTranslations("Agen.kartu");
  return (
    <div className="mb-2 flex flex-col items-start gap-2 rounded-2xl bg-surface-raised p-3">
      <NoData />
      <p className="text-sm">{t("candidate")}</p>
      <Link href={reportHref(target, name)} className={buttonClass("outline", "sm")}>
        <Icon icon={IconPencil} />
        {t("report")}
      </Link>
      <p className="text-sm text-text-secondary">{t("attribution")}</p>
    </div>
  );
}

const sameTarget = (a: CardTarget, b: CardTarget) => JSON.stringify(a) === JSON.stringify(b);

type Props = {
  cards: AgenCard[];
  /** Titik awal saat pertanyaan dikirim: kartu rute langsung memuat rutenya. Tanpa itu, kartu meminta titik awal. */
  from?: LatLng;
  startCopy: StartPointCopy;
};

/**
 * Kartu dari satu jawaban Agen AI, tepat di bawah jawaban itu (ADR-0054): prioritas kecamatan, tempat, dan rute jalan
 * kaki. Rute dihitung web sendiri dengan titik awal pengguna; agen hanya menyebut tujuannya.
 */
export function AgenCards({ cards, from, startCopy }: Props) {
  const t = useTranslations("Agen.kartu");
  if (cards.length === 0) return null;
  const places = cards.filter((card): card is PlaceCard => card.type === "tempat");
  return (
    <ul aria-label={t("label")} className="flex w-full flex-col gap-3">
      {cards.map((card, index) => {
        if (card.type === "prioritas") {
          return (
            <li key={index} className={cardClass}>
              <PriorityTable data={card} />
            </li>
          );
        }
        if (card.type === "tempat") {
          return (
            <li key={index}>
              <Place card={card} />
            </li>
          );
        }
        const place = places.find((p) => sameTarget(p.target, card.target));
        return (
          <li key={index}>
            {card.target.kind === "osm" && !place && <CandidateNote target={card.target} name={card.name} />}
            <RouteCard
              target={card.target}
              name={card.name}
              destination={place && "location" in place ? place.location : undefined}
              endpoints={AGEN_ENDPOINTS}
              from={from}
              startCopy={startCopy}
            />
          </li>
        );
      })}
    </ul>
  );
}
