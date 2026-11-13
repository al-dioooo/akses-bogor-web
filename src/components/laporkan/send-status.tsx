"use client";

import { useTranslations } from "next-intl";
import type { PhotoDraft } from "@/lib/isian-laporan";
import { buttonClass } from "@/ui/button-styles";
import { Icon } from "@/ui/icon";
import { IconAlertTriangle, IconCircleCheck, IconClock, IconTrash } from "@/ui/icons";

export type UploadState = { state: "menunggu" | "mengunggah" | "terunggah" | "gagal"; fraction: number };
export type Sending = { phase: "foto" | "kirim"; current: number; uploads: Record<string, UploadState> };
export type SendProblem = { kind: "foto"; key: string; message: string } | { kind: "lokasi"; message: string } | { kind: "galat"; message: string | null };

type Props = {
  photos: PhotoDraft[];
  sending: Sending | null;
  problem: SendProblem | null;
  onRemovePhoto: (key: string) => void;
  onFixLocation: () => void;
};

const ICON = { menunggu: IconClock, mengunggah: IconClock, terunggah: IconCircleCheck, gagal: IconAlertTriangle };

/**
 * Kemajuan "Kirim laporan" (ADR-0033): satu baris per foto dengan `progress` dan teks keadaannya, keadaan keseluruhan
 * yang dibacakan pembaca layar, dan pilihan bila ada yang gagal. Isian tetap di draf apa pun hasilnya.
 */
export function SendStatus({ photos, sending, problem, onRemovePhoto, onFixLocation }: Props) {
  const t = useTranslations("Laporkan.kirim");
  const failedIndex = problem?.kind === "foto" ? photos.findIndex((photo) => photo.key === problem.key) : -1;
  const uploads = sending?.uploads ?? {};
  const showList = photos.length > 0 && (sending || problem?.kind === "foto");

  return (
    <div className="flex flex-col gap-3">
      <p role="status" className="font-semibold empty:hidden">
        {sending ? (sending.phase === "foto" ? t("uploading", { number: sending.current + 1, total: photos.length }) : t("submitting")) : ""}
      </p>

      {showList && (
        <ul className="flex flex-col gap-2">
          {photos.map((photo, index) => {
            const upload: UploadState = photo.uploadedId
              ? { state: "terunggah", fraction: 1 }
              : index === failedIndex
                ? { state: "gagal", fraction: 0 }
                : (uploads[photo.key] ?? { state: "menunggu", fraction: 0 });
            const percent = Math.round(upload.fraction * 100);
            return (
              <li key={photo.key} className="flex flex-col gap-1.5 rounded-2xl bg-bg-sunken p-3">
                <span className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex items-center gap-2 font-semibold">
                    <Icon icon={ICON[upload.state]} className={`size-4.5 ${upload.state === "gagal" ? "text-text-error" : upload.state === "terunggah" ? "text-status-accessible-fg" : ""}`} />
                    <span id={`kirim-foto-${photo.key}`}>{t("progressLabel", { number: index + 1 })}</span>
                  </span>
                  <span>{t(`state.${upload.state}`, { percent })}</span>
                </span>
                <progress aria-labelledby={`kirim-foto-${photo.key}`} value={percent} max={100} className="h-2 w-full accent-(--color-brand-fill)" />
              </li>
            );
          })}
        </ul>
      )}

      {problem && (
        <div role="alert" className="flex flex-col items-start gap-3 rounded-2xl border-2 border-border-error p-4 text-text-error">
          <p className="flex items-start gap-2 font-semibold">
            <Icon icon={IconAlertTriangle} className="mt-0.5 size-5" />
            {problem.kind === "foto"
              ? t("photoFailed", { number: failedIndex + 1, message: problem.message })
              : problem.kind === "lokasi"
                ? t("locationProblem", { message: problem.message })
                : problem.message
                  ? t("failed", { message: problem.message })
                  : t("offline")}
          </p>
          {problem.kind === "foto" && failedIndex >= 0 && (
            <button type="button" onClick={() => onRemovePhoto(problem.key)} className={buttonClass("outline", "sm")}>
              <Icon icon={IconTrash} />
              {t("removePhoto", { number: failedIndex + 1 })}
            </button>
          )}
          {problem.kind === "lokasi" && (
            <button type="button" onClick={onFixLocation} className={buttonClass("outline", "sm")}>
              {t("fixLocation")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
