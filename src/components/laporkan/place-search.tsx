"use client";

import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import type { LatLng, SearchResults } from "@/lib/laporan";
import { buttonClass } from "@/ui/button-styles";
import { fieldClass } from "@/ui/field-styles";
import { Icon } from "@/ui/icon";
import { IconCircleCheck, IconMapPin, IconSearch } from "@/ui/icons";

/** Satu hasil yang bisa dipilih: lokasi AksesBogor (`existingId`) atau hasil Mapbox. */
export type SearchPick = { name: string; detail: string | null; point: LatLng; existingId?: string };

const MIN_LETTERS = 3;
const DEBOUNCE_MS = 400;

/**
 * Pencarian tempat untuk pemilih lokasi (ADR-0015, ADR-0032), dengan pola combobox ARIA: daftar hasil dipilih dengan
 * panah dan Enter, jumlah hasil dibacakan, dan Escape menutup daftar. Memilih hasil hanya memindah titik; hasil Mapbox
 * tidak disimpan.
 */
export function PlaceSearch({ near, onPick }: { near: LatLng | null; onPick: (pick: SearchPick) => void }) {
  const t = useTranslations("Laporkan.lokasi");
  const id = useId();
  const listId = `${id}-hasil`;
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<SearchPick[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const latest = useRef(0);
  // Nama hasil yang dipilih ditulis ke kolom; perubahan itu tidak memicu pencarian baru.
  const chosen = useRef<string | null>(null);
  const nearRef = useRef(near);
  useEffect(() => {
    nearRef.current = near;
  }, [near]);

  async function search(q: string) {
    const request = ++latest.current;
    setBusy(true);
    setStatus(t("searching"));
    try {
      const response = await fetch("/laporkan/cari", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ q, near: nearRef.current ?? undefined }),
      });
      const body = (await response.json()) as SearchResults & { pesan?: string };
      if (request !== latest.current) return;
      if (!response.ok) {
        setOptions([]);
        setOpen(false);
        setStatus(body.pesan ?? t("galat.cari"));
        return;
      }
      const picks: SearchPick[] = [
        ...body.places.map((p) => ({ name: p.name, detail: p.district.name, point: p.location, existingId: p.id })),
        ...body.results.map((r) => ({ name: r.name, detail: r.address, point: r.location })),
      ];
      setOptions(picks);
      setOpen(picks.length > 0);
      setActive(-1);
      setStatus(t("results", { count: picks.length, q }));
    } catch {
      if (request === latest.current) setStatus(t("galat.cari"));
    } finally {
      if (request === latest.current) setBusy(false);
    }
  }

  // Mencari setelah pelapor berhenti mengetik, supaya tidak memanggil API di setiap huruf.
  useEffect(() => {
    const q = query.trim();
    if (q.length < MIN_LETTERS || query === chosen.current) return;
    const timer = setTimeout(() => void search(q), DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `search` dibuat ulang setiap render; cukup bereaksi pada kata kunci.
  }, [query]);

  function choose(index: number) {
    const pick = options[index];
    if (!pick) return;
    setOpen(false);
    setActive(-1);
    chosen.current = pick.name;
    setQuery(pick.name);
    latest.current++;
    onPick(pick);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" && options.length) {
      event.preventDefault();
      setOpen(true);
      setActive((index) => (index + 1) % options.length);
    } else if (event.key === "ArrowUp" && options.length) {
      event.preventDefault();
      setOpen(true);
      setActive((index) => (index <= 0 ? options.length - 1 : index - 1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (open && active >= 0) choose(active);
      else if (query.trim().length >= MIN_LETTERS) void search(query.trim());
    } else if (event.key === "Escape" && open) {
      event.preventDefault();
      setOpen(false);
      setActive(-1);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={`${id}-cari`} className="font-semibold">
        {t("searchLabel")}
      </label>
      <p id={`${id}-petunjuk`} className="text-sm text-text-secondary">
        {t("searchHint")}
      </p>
      <div className="relative flex gap-2">
        <input
          id={`${id}-cari`}
          type="text"
          role="combobox"
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listId}
          aria-activedescendant={open && active >= 0 ? `${id}-opsi-${active}` : undefined}
          aria-describedby={`${id}-petunjuk`}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={onKeyDown}
          className={fieldClass(false, "min-w-0 flex-1")}
        />
        <button
          type="button"
          onClick={() => query.trim().length >= MIN_LETTERS && void search(query.trim())}
          disabled={busy}
          className={buttonClass("outline", "md", "shrink-0 px-4 disabled:opacity-70")}
        >
          <Icon icon={IconSearch} />
          <span className="max-[22rem]:sr-only">{t("searchButton")}</span>
        </button>
        <div
          id={listId}
          role="listbox"
          aria-label={t("resultsLabel")}
          hidden={!open}
          className="panel-raised absolute inset-x-0 top-full z-20 mt-2 max-h-80 overflow-y-auto rounded-2xl p-1.5"
        >
          {options.map((option, index) => (
            <div
              key={`${option.name}-${index}`}
              id={`${id}-opsi-${index}`}
              role="option"
              aria-selected={index === active}
              // Fokus tetap di kolom pencarian (aria-activedescendant); opsi hanya bisa difokus lewat skrip.
              tabIndex={-1}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(index)}
              onKeyDown={(event) => event.key === "Enter" && choose(index)}
              className={`flex min-h-11 cursor-pointer items-start gap-3 rounded-xl px-3 py-2.5 ${index === active ? "bg-surface-hover outline-2 outline-focus-ring" : "hover:bg-surface-hover"}`}
            >
              <Icon icon={option.existingId ? IconCircleCheck : IconMapPin} className="mt-0.5 size-5 text-icon-brand" />
              <span className="flex flex-col">
                <span className="font-semibold">{option.existingId ? t("existingOption", { name: option.name, district: option.detail ?? "" }) : option.name}</span>
                {!option.existingId && option.detail && <span className="text-sm text-text-secondary">{option.detail}</span>}
              </span>
            </div>
          ))}
        </div>
      </div>
      <p role="status" className="text-sm text-text-secondary empty:hidden">
        {status}
      </p>
    </div>
  );
}
