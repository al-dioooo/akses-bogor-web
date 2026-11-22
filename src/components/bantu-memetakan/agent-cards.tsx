"use client";

import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import type { AgentCard } from "@/lib/agen-rute";
import { PriorityTable } from "@/components/prioritas/priority-table";
import { RouteCard } from "@/components/rute-jalan-kaki/route-card";
import { buttonClass } from "@/ui/button-styles";
import { Icon } from "@/ui/icon";
import { IconExternalLink, IconHelpCircle, IconPencil } from "@/ui/icons";
import { CATEGORY_ICON } from "@/ui/place-icons";
import { StatusBadge } from "@/ui/status-badge";

type PlaceCard = Extract<AgentCard, { type: "tempat" }>;

const cardClass = "flex flex-col items-start gap-3 rounded-3xl border-2 border-border-subtle bg-surface-raised p-4 sm:p-5";

function Place({ card }: { card: PlaceCard }) {
  const t = useTranslations("BantuMemetakan.kartu");
  const tk = useTranslations("Kategori");
  const format = useFormatter();
  const name = card.name ?? t("unnamed");
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
          <p className="text-sm text-text-secondary">{t("verified", { date: format.dateTime(new Date(card.lastVerifiedAt), { dateStyle: "long" }) })}</p>
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
        "osmUrl" in card && (
          <>
            <p className="inline-flex items-center gap-1.5 rounded-full bg-status-unknown-bg px-2.5 py-1 text-sm font-bold text-status-unknown-fg">
              <Icon icon={IconHelpCircle} className="size-4" />
              {t("noData")}
            </p>
            <div className="flex flex-wrap gap-2">
              <Link href="/laporkan" className={buttonClass("outline", "sm")}>
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

const sameTarget = (a: AgentCard & { target?: unknown }, b: PlaceCard) => JSON.stringify(a.target) === JSON.stringify(b.target);

/**
 * Kartu dari satu jawaban agen (ADR-0043), tampil tepat setelah pesan agen yang membuatnya: tempat (lokasi AksesBogor
 * atau fasilitas OSM tanpa data), prioritas kecamatan, dan rute jalan kaki. Rute dihitung web sendiri dengan posisi
 * pengguna; agen hanya menyebut tujuannya.
 */
export function AgentCards({ cards }: { cards: AgentCard[] }) {
  const t = useTranslations("BantuMemetakan.kartu");
  if (cards.length === 0) return null;
  const places = cards.filter((card): card is PlaceCard => card.type === "tempat");
  return (
    <ul aria-label={t("cardsLabel")} className="flex w-full flex-col gap-3">
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
        const place = places.find((p) => sameTarget(card, p));
        return (
          <li key={index}>
            <RouteCard target={card.target} name={card.name} destination={place && "location" in place ? place.location : undefined} />
          </li>
        );
      })}
    </ul>
  );
}
