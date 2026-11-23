"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import type { ProviderHint, ProviderHints as Hints } from "@/lib/api";
import { Icon } from "@/ui/icon";
import { IconInfoCircle } from "@/ui/icons";

type Found = Extract<ProviderHint, { result: "found" }>;
type State = { key: string; data: Hints | "galat" } | null;
const FLAGS = ["entrance", "restroom", "parking", "seating"] as const;

// Selama petunjuk dimatikan di API, halaman ini tidak memintanya lagi sampai dimuat ulang.
let switchedOff = false;

/** Petunjuk dari route web, "galat" bila gagal, atau null bila dibatalkan karena kartunya sudah ditutup. */
async function load(query: string, signal: AbortSignal): Promise<Hints | "galat" | null> {
  try {
    const response = await fetch(`/peta/petunjuk?${query}`, { signal, cache: "no-store" });
    return response.ok ? ((await response.json()) as Hints) : "galat";
  } catch {
    return signal.aborted ? null : "galat";
  }
}

/**
 * Petunjuk aksesibilitas dari Mapbox dan Google (ADR-0052) di Detail lokasi dan kartu Peta: diambil langsung saat
 * ditampilkan, tidak disimpan, dan selalu diberi label "belum diperiksa tim". Petunjuk tidak mengubah status atau
 * jawaban fasilitas. Bagian ini tidak tampil selama petunjuk dimatikan. Di Peta, `delay` menunda permintaan supaya
 * kartu yang hanya dilewati tidak memanggil penyedia.
 */
export function ProviderHints({ source, level, delay = 0 }: { source: { lokasi: string } | { osm: string }; level: 3 | 4; delay?: number }) {
  const t = useTranslations("Petunjuk");
  const query = "lokasi" in source ? `lokasi=${encodeURIComponent(source.lokasi)}` : `osm=${encodeURIComponent(source.osm)}`;
  const [state, setState] = useState<State>(null);
  const [off, setOff] = useState(switchedOff);

  useEffect(() => {
    if (switchedOff) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      const data = await load(query, controller.signal);
      if (!data || controller.signal.aborted) return;
      if (data !== "galat" && data.hints.length === 0) {
        switchedOff = true;
        setOff(true);
      }
      setState({ key: query, data });
    }, delay);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query, delay]);

  if (off) return null;
  const loaded = state?.key === query ? state.data : null;
  const found = loaded && loaded !== "galat" ? loaded.hints.filter((hint): hint is Found => hint.result === "found") : [];
  const failed = loaded === "galat" || (loaded && loaded.hints.every((hint) => hint.result === "unavailable"));
  const Heading = level === 3 ? "h3" : "h4";
  const id = `petunjuk-${query.replace(/[^a-z0-9]/gi, "-")}`;

  return (
    <section aria-labelledby={id} aria-busy={!loaded} className="flex w-full flex-col gap-2 rounded-2xl border-2 border-dashed border-border-subtle p-4">
      <Heading id={id} className="flex items-start gap-2 font-heading text-base font-bold">
        <Icon icon={IconInfoCircle} className="mt-0.5 size-5 shrink-0 text-icon-secondary" />
        {t("title")}
      </Heading>
      <p className="text-sm text-text-secondary">{t("body")}</p>
      {!loaded ? (
        <p className="text-sm text-text-secondary">{t("loading")}</p>
      ) : failed ? (
        <p className="text-sm">{t("failed")}</p>
      ) : found.length === 0 ? (
        <p className="text-sm">{t("none")}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {found.map((hint) => (
            <li key={hint.provider} className="flex flex-col gap-0.5">
              <p className="font-semibold">
                {hint.provider === "mapbox"
                  ? t("mapbox", { answer: t(hint.wheelchairAccessible ? "wheelchair.yes" : "wheelchair.no") })
                  : t("google", { answers: FLAGS.map((flag) => t(`flags.${flag}.${String(hint.accessibility[flag]) as "true" | "false" | "null"}`)).join(" · ") })}
              </p>
              <p className="text-sm text-text-secondary">
                {t("match", { name: hint.placeName, meters: hint.distanceMeters })}{" "}
                {hint.provider === "mapbox" ? (
                  <span>© Mapbox</span>
                ) : hint.url ? (
                  <a href={hint.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-text-primary underline underline-offset-2">
                    Google Maps<span className="sr-only"> {t("newTab")}</span>
                  </a>
                ) : (
                  <span>Google Maps</span>
                )}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
