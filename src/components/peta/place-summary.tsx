"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useState, type RefObject } from "react";
import type { PlaceCardDetail } from "@/app/peta/lokasi/[id]/route";
import { buttonClass } from "@/ui/button-styles";
import { FacilityMeter } from "@/ui/facility-meter";
import { Icon } from "@/ui/icon";
import { IconArrowRight, IconMessageReport, IconRoute, IconX } from "@/ui/icons";
import { CATEGORY_ICON } from "@/ui/place-icons";
import { StatusBadge } from "@/ui/status-badge";
import type { MapPlace } from "./places";

type Detail = { id: string; data: PlaceCardDetail | null };

/**
 * Kartu lokasi yang dipilih di peta, di dalam panel daftar: kategori dan kecamatan, status (ADR-0018), ringkasan "X dari
 * Y fasilitas", dan tautan ke Detail, Tanya rute (ADR-0050), dan Laporkan kekurangan. Kecamatan dan ringkasan dimuat
 * sesudahnya; bila gagal, kartu tetap berisi status dan tautan. Judulnya menerima fokus saat lokasi dipilih.
 */
export function PlaceSummary({ place, headingRef, onClose }: { place: MapPlace; headingRef: RefObject<HTMLHeadingElement | null>; onClose: () => void }) {
  const t = useTranslations("Peta");
  const td = useTranslations("Detail");
  const tk = useTranslations("Kategori");
  const [detail, setDetail] = useState<Detail | null>(null);
  const loaded = detail?.id === place.id ? detail : null;

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/peta/lokasi/${encodeURIComponent(place.id)}`, { signal: controller.signal })
      .then((response) => (response.ok ? (response.json() as Promise<PlaceCardDetail>) : null))
      .catch(() => null)
      .then((data) => {
        if (!controller.signal.aborted) setDetail({ id: place.id, data });
      });
    return () => controller.abort();
  }, [place.id]);

  const summary = loaded?.data?.summary;
  return (
    <section aria-labelledby="judul-ringkasan" className="relative flex flex-col items-start gap-3 px-5 pt-1 pb-5">
      <p className="inline-flex flex-wrap items-center gap-x-1.5 pr-12 text-sm font-semibold">
        <Icon icon={CATEGORY_ICON[place.category]} className="size-4.5 text-icon-brand" />
        {tk(place.category)}
        {loaded?.data && <span className="font-normal text-text-secondary">· {loaded.data.district}</span>}
      </p>
      <h3 id="judul-ringkasan" ref={headingRef} tabIndex={-1} className="pr-12 font-heading text-2xl leading-tight font-bold">
        {place.name}
      </h3>
      <StatusBadge status={place.status} />
      {/* Hanya ringkasan fasilitas yang sedang dimuat; judul (yang menerima fokus) dan status sudah lengkap. */}
      <div aria-busy={!loaded} className="flex w-full max-w-xs flex-col gap-2 empty:hidden">
        {summary ? (
          <>
            <p className="font-semibold">{td("summary", { available: summary.available, relevant: summary.relevant })}</p>
            <FacilityMeter summary={summary} status={place.status} />
            {summary.unknown > 0 && <p className="text-sm text-text-secondary">{td("unknown", { count: summary.unknown })}</p>}
          </>
        ) : (
          !loaded && <span aria-hidden="true" className="h-12 w-full rounded-xl bg-bg-sunken" />
        )}
      </div>
      <div className="flex flex-wrap gap-2 pt-1">
        <Link href={`/lokasi/${place.id}`} className={buttonClass("primary", "sm")}>
          {t("summary.detail")}
          <Icon icon={IconArrowRight} />
        </Link>
        <Link href={`/tanya-rute?tempat=${place.id}`} className={buttonClass("outline", "sm")}>
          <Icon icon={IconRoute} />
          {td("askRoute")}
        </Link>
        <Link href={`/laporkan?lokasi=${place.id}&jenis=kekurangan`} className={buttonClass("outline", "sm")}>
          <Icon icon={IconMessageReport} />
          {td("report")}
        </Link>
      </div>
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
