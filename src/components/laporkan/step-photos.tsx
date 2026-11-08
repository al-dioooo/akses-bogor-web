"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { FieldError } from "@/components/akun/form-parts";
import { ACCEPT_ATTRIBUTE, PhotoError, shrinkPhoto, type PhotoProblem } from "@/lib/foto";
import { LIMITS, PHOTO_TAGS, suggestedPhotos, type FieldError as StepError, type PhotoDraft, type ReportDraft } from "@/lib/isian-laporan";
import { buttonClass } from "@/ui/button-styles";
import { fieldClass } from "@/ui/field-styles";
import { Icon } from "@/ui/icon";
import { IconAlertTriangle, IconCircleCheck, IconCircleMinus, IconPlus, IconTrash } from "@/ui/icons";
import { errorFor, TextField } from "./form-parts";

type Props = { draft: ReportDraft; errors: StepError[]; update: (change: Partial<ReportDraft>) => void };

/** Pratinjau dari Blob di draf; alamat Blob dilepas saat foto tidak tampil lagi. */
function Preview({ blob, alt }: { blob: Blob; alt: string }) {
  const attach = useCallback(
    (img: HTMLImageElement | null) => {
      if (!img) return;
      const url = URL.createObjectURL(blob);
      img.src = url;
      return () => URL.revokeObjectURL(url);
    },
    [blob],
  );
  // eslint-disable-next-line @next/next/no-img-element -- pratinjau lokal dari Blob, bukan gambar yang dioptimasi Next.
  return <img ref={attach} alt={alt} className="aspect-[4/3] w-full rounded-2xl bg-bg-sunken object-cover sm:w-40" />;
}

/**
 * Langkah 3 (FR-25, ADR-0023): hingga 10 foto yang diperkecil di perangkat, masing-masing dengan tag objek dan
 * keterangan, lalu deskripsi tambahan. Foto bisa dipilih dengan tombol atau diletakkan di area foto; tag dipilih dari
 * daftar, jadi tidak ada yang butuh seret-lepas.
 */
export function StepPhotos({ draft, errors, update }: Props) {
  const t = useTranslations("Laporkan.foto");
  const tl = useTranslations("Laporkan");
  const [status, setStatus] = useState("");
  const [problems, setProblems] = useState<{ name: string; problem: PhotoProblem | "penuh" }[]>([]);
  const [busy, setBusy] = useState(false);
  const picker = useRef<HTMLInputElement>(null);
  const photos = draft.photos;
  const latest = useRef(photos);
  useEffect(() => {
    latest.current = photos;
  }, [photos]);

  async function add(files: File[]) {
    if (!files.length) return;
    setBusy(true);
    setProblems([]);
    setStatus(t("processing", { count: files.length }));
    const added: PhotoDraft[] = [];
    const failed: typeof problems = [];
    for (const file of files) {
      if (latest.current.length + added.length >= LIMITS.photos) {
        failed.push({ name: file.name, problem: "penuh" });
        continue;
      }
      try {
        const { blob, width, height } = await shrinkPhoto(file);
        added.push({ key: crypto.randomUUID(), blob, name: file.name, width, height, tag: "", caption: "", uploadedId: null });
      } catch (error) {
        failed.push({ name: file.name, problem: error instanceof PhotoError ? error.problem : "tidakTerbaca" });
      }
    }
    if (added.length) update({ photos: [...latest.current, ...added] });
    setProblems(failed);
    setStatus(added.length ? t("added", { count: added.length }) : "");
    setBusy(false);
  }

  function change(key: string, next: Partial<PhotoDraft>) {
    update({ photos: photos.map((photo) => (photo.key === key ? { ...photo, ...next } : photo)) });
  }

  function remove(index: number) {
    const rest = photos.filter((_, i) => i !== index);
    update({ photos: rest });
    setStatus(t("removed", { number: index + 1 }));
    // Fokus ke foto berikutnya, atau ke tombol pilih foto bila tidak ada lagi.
    requestAnimationFrame(() => {
      const next = rest[index] ?? rest[index - 1];
      (next ? document.getElementById(`tag-${next.key}`) : picker.current)?.focus();
    });
  }

  // Meletakkan foto hanya tambahan untuk tetikus; tombol "Pilih foto" tetap jalur utama. Listener dipasang langsung
  // karena label bukan elemen interaktif bagi jsx-a11y, padahal kolom berkasnya ada di dalam label itu.
  const dropzone = useRef<HTMLLabelElement>(null);
  const addRef = useRef(add);
  useEffect(() => {
    addRef.current = add;
  });
  useEffect(() => {
    const zone = dropzone.current;
    if (!zone) return;
    const over = (event: DragEvent) => event.preventDefault();
    const drop = (event: DragEvent) => {
      event.preventDefault();
      void addRef.current([...(event.dataTransfer?.files ?? [])]);
    };
    zone.addEventListener("dragover", over);
    zone.addEventListener("drop", drop);
    return () => {
      zone.removeEventListener("dragover", over);
      zone.removeEventListener("drop", drop);
    };
  }, []);

  const full = photos.length >= LIMITS.photos;
  const description = draft.description;
  const descriptionError = errorFor(errors, "deskripsi");
  const countError = errorFor(errors, "foto");
  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="judul-foto" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 id="judul-foto" className="font-heading text-xl font-bold">
            {t("title")}
          </h3>
          <p className="font-mono text-sm">{t("count", { count: photos.length, max: LIMITS.photos })}</p>
        </div>
        <p className="text-text-secondary">{t("intro")}</p>

        <div className="rounded-2xl bg-bg-sunken p-4">
          <h4 className="mb-2 font-semibold">{t("suggestedTitle")}</h4>
          <ul className="flex flex-col gap-1.5">
            {suggestedPhotos(draft).map(({ tag, done }) => (
              <li key={tag} className="flex items-center gap-2">
                <Icon icon={done ? IconCircleCheck : IconCircleMinus} className={`size-5 ${done ? "text-status-accessible-fg" : "text-icon-secondary"}`} />
                {t(`tags.${tag}`)} <span className="sr-only">{done ? t("suggestedDone") : t("suggestedMissing")}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Label ini juga area letak foto; tombol dan pembaca layar memakai kolom berkas di dalamnya. */}
        <label
          ref={dropzone}
          className={`flex cursor-pointer flex-col items-start gap-3 rounded-2xl border-2 border-dashed border-border-strong p-4 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus-ring ${full || busy ? "cursor-not-allowed opacity-60" : "hover:bg-surface-hover"}`}
        >
          <input
              ref={picker}
              id="foto"
              type="file"
              accept={ACCEPT_ATTRIBUTE}
              multiple
              disabled={full || busy}
              aria-labelledby="foto-pilih"
              aria-describedby={`foto-petunjuk${countError ? " foto-galat" : ""}`}
              onChange={(event) => {
                void add([...(event.target.files ?? [])]);
                event.target.value = "";
              }}
              className="sr-only"
            />
          <span className={buttonClass("outline", "md", "pointer-events-none")}>
            <Icon icon={IconPlus} />
            <span id="foto-pilih">{t("pick")}</span>
          </span>
          <span id="foto-petunjuk" className="text-sm text-text-secondary">
            {full ? t("full") : t("pickHint")}
          </span>
          <span aria-hidden="true" className="text-sm text-text-secondary max-lg:hidden">
            {t("drop")}
          </span>
        </label>
        <p role="status" className="font-semibold empty:hidden">
          {status}
        </p>
        <FieldError id="foto-galat" message={countError ? tl(`errors.${countError.message}`, countError.values) : undefined} />
        {problems.length > 0 && (
          <div role="alert" className="flex flex-col gap-2 rounded-2xl border-2 border-border-error p-4 text-text-error">
            <p className="flex items-center gap-2 font-bold">
              <Icon icon={IconAlertTriangle} />
              {t("problemsTitle")}
            </p>
            <ul className="list-disc pl-6">
              {problems.map((item, i) => (
                <li key={`${item.name}-${i}`}>{t(`problem.${item.problem}`, { name: item.name })}</li>
              ))}
            </ul>
          </div>
        )}

        {photos.length > 0 && (
          <ol className="flex flex-col gap-4">
            {photos.map((photo, index) => {
              const number = index + 1;
              const tagError = errorFor(errors, `tag-${photo.key}`);
              return (
                <li key={photo.key} aria-label={t("item", { number })} className="flex flex-col gap-4 rounded-3xl border-2 border-border-subtle p-4 sm:flex-row">
                  <div className="flex flex-col gap-1.5">
                    <Preview blob={photo.blob} alt={t("preview", { number, name: photo.name })} />
                    <p className="text-xs text-text-secondary">{t("size", { width: photo.width, height: photo.height, kb: Math.round(photo.blob.size / 1024) })}</p>
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-3">
                    <div className="flex flex-col gap-2">
                      <label htmlFor={`tag-${photo.key}`} className="font-semibold">
                        {t("tagLabel", { number })}
                      </label>
                      <select
                        id={`tag-${photo.key}`}
                        value={photo.tag}
                        onChange={(event) => change(photo.key, { tag: event.target.value as PhotoDraft["tag"] })}
                        aria-invalid={tagError ? true : undefined}
                        aria-describedby={tagError ? `tag-${photo.key}-galat` : undefined}
                        className={fieldClass(Boolean(tagError))}
                      >
                        <option value="">{t("tagPlaceholder")}</option>
                        {PHOTO_TAGS.map((tag) => (
                          <option key={tag} value={tag}>
                            {t(`tags.${tag}`)}
                          </option>
                        ))}
                      </select>
                      <FieldError id={`tag-${photo.key}-galat`} message={tagError ? tl(`errors.${tagError.message}`, tagError.values) : undefined} />
                    </div>
                    <TextField
                      id={`keterangan-${photo.key}`}
                      label={t("captionLabel", { number })}
                      value={photo.caption}
                      max={LIMITS.caption}
                      error={errorFor(errors, `keterangan-${photo.key}`)}
                      onValue={(caption) => change(photo.key, { caption })}
                      autoComplete="off"
                    />
                    <button type="button" onClick={() => remove(index)} className={buttonClass("ghost", "sm", "self-start")}>
                      <Icon icon={IconTrash} />
                      {t("remove", { number })}
                    </button>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <div className="flex flex-col gap-2">
        <label htmlFor="deskripsi" className="font-semibold">
          {t("descriptionLabel")}
        </label>
        <p id="deskripsi-petunjuk" className="text-text-secondary">
          {t("descriptionHint")}
        </p>
        <textarea
          id="deskripsi"
          rows={4}
          value={description}
          onChange={(event) => update({ description: event.target.value })}
          aria-invalid={descriptionError ? true : undefined}
          aria-describedby={`deskripsi-petunjuk deskripsi-hitung${descriptionError ? " deskripsi-galat" : ""}`}
          className={fieldClass(Boolean(descriptionError), "py-3")}
        />
        <p id="deskripsi-hitung" className={`text-sm ${description.length > LIMITS.description ? "font-semibold text-text-error" : "text-text-secondary"}`}>
          {tl("counter", { count: description.length, max: LIMITS.description })}
        </p>
        <FieldError id="deskripsi-galat" message={descriptionError ? tl(`errors.${descriptionError.message}`, descriptionError.values) : undefined} />
      </div>
    </div>
  );
}
