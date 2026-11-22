"use client";

import { useTranslations } from "next-intl";
import { useId, useRef, useState } from "react";
import { PickerMap } from "@/components/laporkan/picker-map";
import type { Candidate } from "@/components/laporkan/location-picker";
import type { LatLng } from "@/lib/laporan";
import { buttonClass } from "@/ui/button-styles";
import { Icon } from "@/ui/icon";
import { IconFocusCentered, IconMap2, IconShieldCheck } from "@/ui/icons";

/** Tengah Kota Bogor, tengah peta bila lokasi tujuan tidak diketahui. */
const KOTA_BOGOR: LatLng = { lat: -6.5971, lng: 106.7972 };

/** Teks pengganti untuk judul, kegunaan, dan catatan privasi titik awal; yang kosong memakai teks Bantu memetakan. */
export type StartPointCopy = { title?: string; why?: string; privacy?: string };

type Props = {
  /** Lokasi tujuan bila diketahui, tengah peta saat memilih titik awal. */
  destination?: LatLng;
  onStart: (from: LatLng, source: "perangkat" | "peta") => void;
  copy?: StartPointCopy;
  /** Tingkat judul: 4 di dalam kartu rute, 3 di panel halaman. Judul pemilih peta satu tingkat di bawahnya. */
  level?: 3 | 4;
};

/**
 * Titik awal rute (ADR-0042): penjelasan dulu, lalu lokasi perangkat bila diizinkan. Bila ditolak atau tidak ada,
 * pengguna memilih titik di peta dengan pin di tengah, yang bisa digeser dengan tombol arah atau keyboard. Satu
 * percakapan bisa punya beberapa kartu rute, jadi id di sini dibuat unik.
 */
export function StartPoint({ destination, onStart, copy = {}, level = 4 }: Props) {
  const t = useTranslations("RuteJalanKaki.awal");
  const [picking, setPicking] = useState(false);
  const [locating, setLocating] = useState(false);
  const [problem, setProblem] = useState("");
  const [candidate, setCandidate] = useState<Candidate>({ point: destination ?? KOTA_BOGOR, source: "awal" });
  const pickTitle = useRef<HTMLHeadingElement>(null);
  const titleId = useId();
  const Title = level === 3 ? "h3" : "h4";
  const PickTitle = level === 3 ? "h4" : "h5";

  function openMap(message = "") {
    setProblem(message);
    setPicking(true);
    // Fokus pindah ke judul pemilih peta supaya pengguna keyboard dan pembaca layar tahu langkah berikutnya.
    requestAnimationFrame(() => pickTitle.current?.focus());
  }

  function locate() {
    if (!("geolocation" in navigator)) return openMap(t("unsupported"));
    setLocating(true);
    setProblem("");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocating(false);
        onStart({ lat: coords.latitude, lng: coords.longitude }, "perangkat");
      },
      (failure) => {
        setLocating(false);
        openMap(failure.code === failure.PERMISSION_DENIED ? t("denied") : t("noGps"));
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 60_000 },
    );
  }

  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-4">
      <Title id={titleId} className="font-heading text-lg font-bold">
        {copy.title ?? t("title")}
      </Title>
      <p className="text-text-secondary">{copy.why ?? t("why")}</p>
      <p className="flex gap-3 rounded-2xl bg-bg-sunken p-4">
        <Icon icon={IconShieldCheck} className="mt-0.5 size-5 shrink-0 text-icon-brand" />
        <span>{copy.privacy ?? t("privacy")}</span>
      </p>
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={locate} disabled={locating} className={buttonClass("primary", "md", "disabled:opacity-70")}>
          <Icon icon={IconFocusCentered} />
          {locating ? t("locating") : t("useLocation")}
        </button>
        {!picking && (
          <button type="button" onClick={() => openMap()} className={buttonClass("outline", "md")}>
            <Icon icon={IconMap2} />
            {t("pickOnMap")}
          </button>
        )}
      </div>
      <p role="status" className="sr-only">
        {locating ? t("locating") : ""}
      </p>
      {problem && (
        <p role="alert" className="rounded-2xl bg-status-partial-bg p-4 font-semibold text-text-primary">
          {problem}
        </p>
      )}
      {picking && (
        <div className="flex flex-col gap-3">
          <PickTitle ref={pickTitle} tabIndex={-1} className="font-heading font-bold">
            {t("pickTitle")}
          </PickTitle>
          <PickerMap candidate={candidate} onMove={setCandidate} unavailable={t("mapUnavailable")} />
          <button type="button" onClick={() => onStart(candidate.point, "peta")} className={buttonClass("primary", "md", "self-start")}>
            {t("usePoint")}
          </button>
        </div>
      )}
    </section>
  );
}
