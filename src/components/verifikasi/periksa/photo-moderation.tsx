"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { moderateReportPhoto } from "@/app/verifikasi/actions";
import type { PhotoTag } from "@/lib/api";
import { PHOTO_TAGS } from "@/lib/isian-laporan";
import type { ModerationPatch, ReviewPhoto } from "@/lib/verifikasi";
import { buttonClass } from "@/ui/button-styles";
import { fieldClass } from "@/ui/field-styles";
import { Icon } from "@/ui/icon";
import { IconEye, IconEyeOff } from "@/ui/icons";
import { DECISION_LIMITS } from "./decision";

type Props = { reportId: string; photo: ReviewPhoto; number: number; onSaved: (photo: ReviewPhoto) => void; children?: React.ReactNode };

/**
 * Moderasi satu foto (FR-34, ADR-0037): perbaiki tag, keterangan yang tayang, atau sembunyikan foto. Setiap perubahan
 * langsung tersimpan di API dan hasilnya dibacakan pembaca layar. `children` adalah tempat tombol kaburkan area.
 */
export function PhotoModeration({ reportId, photo, number, onSaved, children }: Props) {
  const t = useTranslations("Pemeriksaan.moderation");
  const tags = useTranslations("Laporkan.foto.tags");
  const [caption, setCaption] = useState(photo.caption ?? "");
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const [pending, start] = useTransition();

  const save = (patch: ModerationPatch) =>
    start(async () => {
      setMessage(t("saving", { number }));
      const result = await moderateReportPhoto(reportId, photo.id, patch);
      setFailed(!result.ok);
      if (result.ok) {
        onSaved(result.photo);
        setMessage(t("saved", { number }));
      } else setMessage(t("galat", { number, message: result.message }));
    });

  const captionId = `keterangan-foto-${photo.id}`;
  return (
    <div className="flex flex-col gap-3 border-t-2 border-dashed border-border-subtle pt-3">
      <label className="flex flex-col gap-1.5 font-semibold">
        {t("tag", { number })}
        <select value={photo.tag} disabled={pending} onChange={(event) => save({ tag: event.target.value as PhotoTag })} className={fieldClass(false, "font-normal")}>
          {PHOTO_TAGS.map((tag) => (
            <option key={tag} value={tag}>
              {tags(tag)}
            </option>
          ))}
        </select>
      </label>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={captionId} className="font-semibold">
          {t("caption", { number })}
        </label>
        <p id={`${captionId}-petunjuk`} className="text-sm text-text-secondary">
          {t("captionHint")}
        </p>
        <input
          id={captionId}
          type="text"
          maxLength={DECISION_LIMITS.note}
          value={caption}
          onChange={(event) => setCaption(event.target.value)}
          aria-describedby={`${captionId}-petunjuk`}
          className={fieldClass()}
        />
        <button
          type="button"
          disabled={pending || caption.trim() === (photo.caption ?? "")}
          onClick={() => save({ caption: caption.trim() || null })}
          className={buttonClass("outline", "sm", "self-start disabled:opacity-50")}
        >
          {t("saveCaption")}
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" aria-pressed={photo.hidden} disabled={pending} onClick={() => save({ hidden: !photo.hidden })} className={buttonClass("outline", "sm")}>
          <Icon icon={photo.hidden ? IconEye : IconEyeOff} />
          {photo.hidden ? t("show", { number }) : t("hide", { number })}
        </button>
        {children}
      </div>
      {photo.hidden && <p className="text-sm text-text-secondary">{t("hiddenNote")}</p>}
      <p role={failed ? "alert" : "status"} className={`text-sm font-semibold ${failed ? "text-text-error" : "text-text-secondary"}`}>
        {message}
      </p>
    </div>
  );
}
