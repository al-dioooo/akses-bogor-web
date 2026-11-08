"use client";

import { useTranslations } from "next-intl";
import { useRef, useState, useTransition, type KeyboardEvent, type PointerEvent } from "react";
import { moderateReportPhoto } from "@/app/verifikasi/actions";
import type { BlurRegion, ReviewPhoto } from "@/lib/verifikasi";
import { buttonClass } from "@/ui/button-styles";
import { fieldClass } from "@/ui/field-styles";
import { Icon } from "@/ui/icon";
import { IconBlur, IconPlus, IconTrash } from "@/ui/icons";
import { areaFromDrag, areaFromKey, centeredArea, clampArea, MAX_AREAS, percent } from "./blur-areas";

type Props = { reportId: string; photo: ReviewPhoto; number: number; onSaved: (photo: ReviewPhoto) => void };
type Point = { x: number; y: number };

/**
 * Editor area kabur (FR-34, ADR-0037). Area bisa ditandai dengan menyeret, atau tanpa mouse: Tambah area, lalu tombol
 * panah menggeser dan Shift + panah mengubah ukuran (WCAG 2.1.1, 2.5.7). Setiap area juga punya kolom angka. Area
 * disimpan di API; pratinjau di halaman memakai kaburan dari API, sama dengan hasil saat terbit.
 */
export function BlurEditor({ reportId, photo, number, onSaved }: Props) {
  const t = useTranslations("Pemeriksaan.blur");
  const dialog = useRef<HTMLDialogElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const boxes = useRef<(HTMLButtonElement | null)[]>([]);
  const [areas, setAreas] = useState<BlurRegion[]>(photo.blur);
  const [selected, setSelected] = useState<number | null>(null);
  const [drag, setDrag] = useState<{ start: Point; end: Point } | null>(null);
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();

  const label = (area: BlurRegion, index: number) => t("area", { number: index + 1, x: percent(area.x), y: percent(area.y), w: percent(area.w), h: percent(area.h) });
  const focusBox = (index: number) => requestAnimationFrame(() => boxes.current[index]?.focus());
  const change = (index: number, area: BlurRegion) => {
    setAreas((current) => current.map((item, i) => (i === index ? clampArea(area) : item)));
    setMessage(label(clampArea(area), index));
  };
  const remove = (index: number) => {
    setAreas((current) => current.filter((_, i) => i !== index));
    setSelected(null);
    setMessage("");
  };
  const add = (area: BlurRegion) => {
    if (areas.length >= MAX_AREAS) return setMessage(t("limit"));
    setAreas((current) => [...current, area]);
    setSelected(areas.length);
    focusBox(areas.length);
  };

  const point = (event: PointerEvent): Point => {
    const box = frame.current!.getBoundingClientRect();
    return { x: Math.min(1, Math.max(0, (event.clientX - box.left) / box.width)), y: Math.min(1, Math.max(0, (event.clientY - box.top) / box.height)) };
  };

  function onBoxKey(event: KeyboardEvent, index: number) {
    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      return remove(index);
    }
    const next = areaFromKey(areas[index]!, event.key, event.shiftKey);
    if (!next) return;
    event.preventDefault();
    change(index, next);
  }

  const open = () => {
    setAreas(photo.blur);
    setSelected(null);
    setMessage("");
    dialog.current?.showModal();
  };

  const save = () =>
    start(async () => {
      setMessage(t("saving"));
      const result = await moderateReportPhoto(reportId, photo.id, { blur: areas });
      if (!result.ok) return setMessage(result.message);
      onSaved(result.photo);
      setMessage(t("result"));
      dialog.current?.close();
    });

  const shown = selected !== null ? areas[selected] : undefined;
  return (
    <>
      <button type="button" aria-haspopup="dialog" onClick={open} className={buttonClass("outline", "sm")}>
        <Icon icon={IconBlur} />
        {t("open", { number })}
      </button>
      <p role="status" className="sr-only">
        {message === t("result") ? message : ""}
      </p>
      <dialog
        ref={dialog}
        aria-labelledby={`kabur-judul-${photo.id}`}
        className="panel-raised m-auto max-h-[calc(100%-2rem)] w-[min(56rem,calc(100%-1rem))] overflow-y-auto rounded-3xl p-4 text-text-primary backdrop:bg-surface-scrim sm:p-6"
      >
        <div className="flex flex-col gap-4">
          <h2 id={`kabur-judul-${photo.id}`} className="font-heading text-2xl font-bold">
            {t("title", { number })}
          </h2>
          <p id={`kabur-petunjuk-${photo.id}`} className="text-text-secondary">
            {t("instructions")}
          </p>
          <div
            ref={frame}
            className="relative mx-auto touch-none overflow-hidden rounded-2xl bg-bg-sunken select-none"
            // Selebar mungkin, tetapi tidak lebih tinggi dari 60% layar, supaya seluruh foto terlihat saat menandai area.
            style={{ width: `min(100%, ${((60 * photo.width) / photo.height).toFixed(2)}vh)` }}
            onPointerDown={(event) => {
              if (event.target !== event.currentTarget && !(event.target instanceof HTMLImageElement)) return;
              event.currentTarget.setPointerCapture(event.pointerId);
              setDrag({ start: point(event), end: point(event) });
            }}
            onPointerMove={(event) => drag && setDrag({ ...drag, end: point(event) })}
            onPointerUp={() => {
              const area = drag && areaFromDrag(drag.start, drag.end);
              setDrag(null);
              if (area) add(area);
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- foto privat dari route handler sendiri */}
            <img
              src={`/verifikasi/foto/${photo.id}?versi=asli`}
              alt={t("photo", { number, count: areas.length })}
              width={photo.width}
              height={photo.height}
              draggable={false}
              className="block h-auto w-full"
            />
            {areas.map((area, index) => (
              <button
                key={index}
                ref={(node) => {
                  boxes.current[index] = node;
                }}
                type="button"
                aria-label={label(area, index)}
                aria-describedby={`kabur-petunjuk-${photo.id}`}
                aria-pressed={selected === index}
                onFocus={() => setSelected(index)}
                onClick={() => setSelected(index)}
                onKeyDown={(event) => onBoxKey(event, index)}
                style={{ left: `${area.x * 100}%`, top: `${area.y * 100}%`, width: `${area.w * 100}%`, height: `${area.h * 100}%` }}
                className={`absolute border-2 bg-white/30 backdrop-blur-md ${selected === index ? "border-border-strong outline-2 outline-offset-2 outline-focus-ring" : "border-dashed border-white"}`}
              >
                <span aria-hidden="true" className="absolute top-1 left-1 rounded bg-text-primary px-1.5 font-mono text-xs text-bg-canvas">
                  {index + 1}
                </span>
              </button>
            ))}
            {drag && areaFromDrag(drag.start, drag.end) && (
              <span
                aria-hidden="true"
                className="absolute border-2 border-dashed border-border-strong bg-white/30"
                style={{ left: `${Math.min(drag.start.x, drag.end.x) * 100}%`, top: `${Math.min(drag.start.y, drag.end.y) * 100}%`, width: `${Math.abs(drag.end.x - drag.start.x) * 100}%`, height: `${Math.abs(drag.end.y - drag.start.y) * 100}%` }}
              />
            )}
          </div>
          <p role="status" className="min-h-6 text-sm font-semibold text-text-secondary">
            {message}
          </p>

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => add(centeredArea())} className={buttonClass("outline", "sm")}>
              <Icon icon={IconPlus} />
              {t("add")}
            </button>
          </div>

          {areas.length === 0 && <p className="text-text-secondary">{t("empty")}</p>}
          {shown && selected !== null && (
            <fieldset className="flex min-w-0 flex-col gap-2 rounded-2xl bg-bg-sunken p-3">
              <legend className="float-left mb-2 w-full font-semibold">{t("fields", { number: selected + 1 })}</legend>
              <div className="clear-both grid grid-cols-2 gap-2 sm:grid-cols-4">
                {(["x", "y", "w", "h"] as const).map((key) => (
                  <label key={key} className="flex flex-col gap-1 text-sm font-semibold">
                    {t(key)}
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={100}
                      value={percent(shown[key])}
                      onChange={(event) => change(selected, { ...shown, [key]: Number(event.target.value) / 100 })}
                      className={fieldClass(false, "text-base font-normal")}
                    />
                  </label>
                ))}
              </div>
              <button type="button" onClick={() => remove(selected)} className={buttonClass("ghost", "sm", "self-start text-text-error")}>
                <Icon icon={IconTrash} />
                {t("remove", { number: selected + 1 })}
              </button>
            </fieldset>
          )}

          <div className="flex flex-wrap justify-end gap-2 border-t-2 border-border-subtle pt-4">
            <button type="button" onClick={() => dialog.current?.close()} className={buttonClass("ghost", "md")}>
              {t("cancel")}
            </button>
            <button type="button" disabled={pending} onClick={save} className={buttonClass("primary", "md", "disabled:opacity-60")}>
              {pending ? t("saving") : t("save")}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
