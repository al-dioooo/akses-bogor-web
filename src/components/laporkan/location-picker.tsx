"use client";

import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { ConfirmedLocation } from "@/lib/isian-laporan";
import type { LatLng, LocationCheck, NearbyPlace } from "@/lib/laporan";
import { FieldError } from "@/components/akun/form-parts";
import { buttonClass } from "@/ui/button-styles";
import { Icon } from "@/ui/icon";
import { IconAlertTriangle, IconCircleCheck, IconFocusCentered, IconMapPin } from "@/ui/icons";
import { PlaceSearch, type SearchPick } from "./place-search";

/** Titik yang sedang dipilih, sebelum dikonfirmasi dengan "Pakai lokasi ini". */
export type Candidate = { point: LatLng; source: "cari" | "gps" | "peta" | "awal"; name?: string; accuracy?: number; existingId?: string };

/** Titik yang berbeda kurang dari ~1 m dianggap sama. */
/** Tombol berlabel nama tempat boleh turun baris, supaya nama yang panjang tidak melebarkan halaman di layar 320 px. */
const LONG_BUTTON = buttonClass("outline", "sm", "py-2 text-left").replace("whitespace-nowrap ", "");

const samePoint = (a: LatLng, b: LatLng) => Math.abs(a.lat - b.lat) < 1e-5 && Math.abs(a.lng - b.lng) < 1e-5;

type Props = {
  confirmed: ConfirmedLocation | null;
  /** Nama tempat di langkah 1, untuk mencari lokasi bernama mirip (FR-23). */
  name: string;
  /** Lokasi yang sedang diedit; tidak ikut dianggap mirip. */
  placeId: string | null;
  error?: string;
  onConfirm: (location: ConfirmedLocation) => void;
  /** Benar selama ada lokasi mirip yang belum dijawab pelapor. */
  onNearbyPending: (pending: boolean) => void;
  /** Peta dengan pin di tengah; tanpa peta, titik dipilih lewat pencarian atau lokasi perangkat. */
  map?: (candidate: Candidate | null, move: (candidate: Candidate) => void) => ReactNode;
};

/**
 * Pemilih lokasi langkah 1 (FR-21 sampai FR-23, ADR-0015): pencarian tempat, "Gunakan lokasi saya", dan peta. Yang
 * disimpan hanya titik yang dikonfirmasi dan sudah dicek kecamatannya. Setiap perubahan titik dibacakan pembaca layar.
 */
export function LocationPicker({ confirmed, name, placeId, error, onConfirm, onNearbyPending, map }: Props) {
  const t = useTranslations("Laporkan.lokasi");
  const format = useFormatter();
  const [editing, setEditing] = useState(!confirmed);
  const [candidate, setCandidate] = useState<Candidate | null>(confirmed ? { point: confirmed.point, source: "awal" } : null);
  const [announcement, setAnnouncement] = useState("");
  const [problem, setProblem] = useState("");
  const [busy, setBusy] = useState<"gps" | "cek" | null>(null);
  const [nearby, setNearby] = useState<NearbyPlace[]>([]);
  const [acknowledged, setAcknowledged] = useState(false);
  const checkedName = useRef<string | null>(null);

  const coordinates = (point: LatLng) => {
    const number = (value: number) => format.number(value, { minimumFractionDigits: 5, maximumFractionDigits: 5 });
    return t("coordinates", { lat: number(point.lat), lng: number(point.lng) });
  };

  useEffect(() => onNearbyPending(nearby.length > 0 && !acknowledged), [nearby, acknowledged, onNearbyPending]);

  async function check(point: LatLng, placeName: string): Promise<LocationCheck | "galat"> {
    const response = await fetch("/laporkan/cek-lokasi", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ location: point, name: placeName.trim() || undefined, placeId: placeId ?? undefined }),
    });
    const body = (await response.json().catch(() => ({}))) as LocationCheck & { pesan?: string };
    if (!response.ok) {
      setProblem(body.pesan ?? t("galat.cek"));
      return "galat";
    }
    checkedName.current = placeName.trim();
    return body;
  }

  // Nama yang berubah setelah lokasi dipakai dicek ulang, supaya peringatan lokasi mirip memakai nama terakhir (FR-23).
  useEffect(() => {
    if (!confirmed || editing || checkedName.current === null || checkedName.current === name.trim()) return;
    const timer = setTimeout(async () => {
      const result = await check(confirmed.point, name).catch(() => "galat" as const);
      if (result !== "galat") {
        setNearby(result.nearby);
        setAcknowledged(false);
      }
    }, 800);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cukup bereaksi pada nama dan titik yang dipakai.
  }, [name, confirmed, editing]);

  function move(next: Candidate, message?: string) {
    setCandidate(next);
    setProblem("");
    if (message) setAnnouncement(message);
  }

  function pick(result: SearchPick) {
    move({ point: result.point, source: "cari", name: result.name, existingId: result.existingId }, t("picked", { name: result.name }));
  }

  function locate() {
    if (!("geolocation" in navigator)) return setProblem(t("galat.gpsTidakDidukung"));
    setBusy("gps");
    setProblem("");
    setAnnouncement(t("locating"));
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setBusy(null);
        const meters = Math.round(coords.accuracy);
        move({ point: { lat: coords.latitude, lng: coords.longitude }, source: "gps", accuracy: meters }, t("located", { meters }));
      },
      (failure) => {
        setBusy(null);
        setAnnouncement("");
        setProblem(failure.code === failure.PERMISSION_DENIED ? t("galat.gpsDitolak") : t("galat.gpsTidakAda"));
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
    );
  }

  async function confirm() {
    if (!candidate) return;
    setBusy("cek");
    setProblem("");
    setAnnouncement(t("checking"));
    const result = await check(candidate.point, name).catch(() => {
      setProblem(t("galat.cek"));
      return "galat" as const;
    });
    setBusy(null);
    if (result === "galat") return setAnnouncement("");
    setNearby(result.nearby);
    setAcknowledged(false);
    setEditing(false);
    setAnnouncement(t("confirmed", { district: result.district.name }));
    onConfirm({ point: candidate.point, district: result.district });
  }

  const moved = confirmed && candidate && !samePoint(candidate.point, confirmed.point);
  const describedBy = ["lokasi-petunjuk", error || problem ? "lokasi-galat" : ""].filter(Boolean).join(" ");

  return (
    <fieldset id="lokasi" tabIndex={-1} aria-describedby={describedBy} className="flex min-w-0 flex-col gap-4 rounded-3xl border-2 border-border-subtle p-4 sm:p-5">
      <legend className="px-1 font-heading text-lg font-bold">{t("legend")}</legend>
      <p id="lokasi-petunjuk" className="text-text-secondary">
        {t("hint")}
      </p>

      {confirmed && !editing ? (
        <div className="flex flex-col items-start gap-3 rounded-2xl bg-status-accessible-bg p-4 text-status-accessible-fg">
          <p className="flex items-start gap-2 font-bold">
            <Icon icon={IconCircleCheck} className="mt-0.5 size-5" />
            {t("confirmedTitle")}
          </p>
          <p className="text-text-primary">{t("confirmedBody", { district: confirmed.district.name, coordinates: coordinates(confirmed.point) })}</p>
          <button type="button" onClick={() => setEditing(true)} className={buttonClass("outline", "sm")}>
            {t("change")}
          </button>
        </div>
      ) : (
        <>
          <PlaceSearch near={candidate?.point ?? null} onPick={pick} />
          <button type="button" onClick={locate} disabled={busy === "gps"} className={buttonClass("outline", "md", "self-start disabled:opacity-70")}>
            <Icon icon={IconFocusCentered} />
            {busy === "gps" ? t("locating") : t("useMyLocation")}
          </button>
          {map?.(candidate, (next) => move(next))}
          <div className="flex items-start gap-3 rounded-2xl bg-bg-sunken p-4">
            <Icon icon={IconMapPin} className="mt-0.5 size-5 text-icon-brand" />
            {candidate ? (
              <p>
                <span className="block font-semibold">{t("candidate")}</span>
                <span className="block text-text-secondary">
                  {t(`candidateFrom.${candidate.source}`, { name: candidate.name ?? "", meters: candidate.accuracy ?? 0 })}
                </span>
                <span className="block font-mono text-sm">{coordinates(candidate.point)}</span>
              </p>
            ) : (
              <p className="text-text-secondary">{t("noCandidate")}</p>
            )}
          </div>
          {candidate?.existingId && (
            <div className="flex flex-col items-start gap-3 rounded-2xl bg-status-partial-bg p-4 text-text-primary">
              <p>{t("existingPicked", { name: candidate.name ?? "" })}</p>
              <Link href={`/laporkan?lokasi=${candidate.existingId}&jenis=kekurangan`} className={LONG_BUTTON}>
                {t("reportGap", { name: candidate.name ?? "" })}
              </Link>
            </div>
          )}
          {moved && <p className="font-semibold">{t("moved")}</p>}
          <button type="button" onClick={confirm} disabled={!candidate || busy === "cek"} className={buttonClass("primary", "md", "self-start disabled:opacity-70")}>
            {busy === "cek" ? t("checking") : t("confirm")}
          </button>
        </>
      )}

      <p role="status" className="sr-only">
        {announcement}
      </p>
      <FieldError id="lokasi-galat" message={problem || error} />

      {nearby.length > 0 && !acknowledged && (
        <section aria-labelledby="lokasi-mirip-judul" className="flex flex-col gap-3 rounded-2xl border-2 border-status-partial-fg p-4">
          <h3 id="lokasi-mirip-judul" className="flex items-start gap-2 font-heading font-bold">
            <Icon icon={IconAlertTriangle} className="mt-0.5 size-5 text-status-partial-fg" />
            {t("nearbyTitle")}
          </h3>
          <p className="text-text-secondary">{t("nearbyBody")}</p>
          <ul className="flex flex-col gap-2">
            {nearby.map((place) => (
              <li key={place.id} className="flex flex-col items-start gap-2 rounded-2xl bg-bg-sunken p-3">
                <span className="font-semibold">{t("nearbyItem", { name: place.name, distance: place.distanceMeters })}</span>
                <Link href={`/laporkan?lokasi=${place.id}&jenis=kekurangan`} className={LONG_BUTTON}>
                  {t("reportGap", { name: place.name })}
                </Link>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => {
              setAcknowledged(true);
              setAnnouncement(t("nearbyAcknowledged"));
            }}
            className={buttonClass("ghost", "sm", "self-start")}
          >
            {t("nearbyDifferent")}
          </button>
        </section>
      )}
    </fieldset>
  );
}
