"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, useTransition } from "react";
import { sendClarificationAnswer } from "@/app/akun/actions";
import type { PhotoTag } from "@/lib/api";
import { ACCEPT_ATTRIBUTE, PhotoError, shrinkPhoto } from "@/lib/foto";
import { PHOTO_TAGS } from "@/lib/isian-laporan";
import { buttonClass } from "@/ui/button-styles";
import { fieldClass } from "@/ui/field-styles";
import { Icon } from "@/ui/icon";
import { IconCircleCheck, IconPhoto, IconSend, IconTrash } from "@/ui/icons";
import { FieldError, FormAlert } from "./form-parts";

type Added = { key: string; preview: string; id: string; tag: PhotoTag | ""; caption: string };

/** Unggah satu foto yang sudah diperkecil lewat server web (ADR-0031), sama dengan Laporkan. */
async function upload(blob: Blob): Promise<{ id: string } | { pesan: string }> {
  try {
    const response = await fetch("/laporkan/foto", { method: "POST", headers: { "content-type": "image/jpeg" }, body: blob });
    const body = (await response.json().catch(() => ({}))) as { id?: string; pesan?: string };
    return response.ok && body.id ? { id: body.id } : { pesan: body.pesan ?? "" };
  } catch {
    return { pesan: "" };
  }
}

/**
 * Jawaban klarifikasi pelapor (FR-41, ADR-0036): teks dan foto baru bertag, dengan total foto laporan paling banyak 10.
 * Foto diperkecil di browser dan diunggah saat dipilih; yang dihapus lagi dibersihkan API setelah 24 jam.
 */
export function ClarificationAnswer({ reportId, remaining }: { reportId: string; remaining: number }) {
  const t = useTranslations("JawabKlarifikasi");
  const tags = useTranslations("Laporkan.foto.tags");
  const problems = useTranslations("Laporkan.foto.problem");
  const [answer, setAnswer] = useState("");
  const [photos, setPhotos] = useState<Added[]>([]);
  const [status, setStatus] = useState("");
  const [error, setError] = useState<{ field?: string; message: string } | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pending, start] = useTransition();
  const done = useRef<HTMLHeadingElement>(null);
  const text = useRef<HTMLTextAreaElement>(null);

  useEffect(() => done.current?.focus(), [sent]);
  useEffect(() => () => photos.forEach((photo) => URL.revokeObjectURL(photo.preview)), [photos]);

  async function add(files: FileList) {
    setBusy(true);
    for (const file of [...files].slice(0, remaining - photos.length)) {
      setStatus(t("uploading", { name: file.name }));
      try {
        const shrunk = await shrinkPhoto(file);
        const result = await upload(shrunk.blob);
        if ("pesan" in result) {
          setStatus(t("uploadFailed", { name: file.name, message: result.pesan }));
          continue;
        }
        setPhotos((current) => [...current, { key: crypto.randomUUID(), preview: URL.createObjectURL(shrunk.blob), id: result.id, tag: "", caption: "" }]);
        setStatus(t("uploaded", { name: file.name }));
      } catch (problem) {
        setStatus(problem instanceof PhotoError ? problems(problem.problem, { name: file.name }) : t("uploadFailed", { name: file.name, message: "" }));
      }
    }
    setBusy(false);
  }

  function send() {
    if (!answer.trim()) {
      setError({ field: "jawaban", message: t("answerEmpty") });
      return text.current?.focus();
    }
    if (photos.some((photo) => !photo.tag)) return setError({ message: t("tagMissing") });
    setError(null);
    start(async () => {
      const result = await sendClarificationAnswer(
        reportId,
        answer.trim(),
        photos.map(({ id, tag, caption }) => ({ id, tag, ...(caption.trim() ? { caption: caption.trim() } : {}) })),
      );
      if (result.ok) setSent(true);
      else setError({ message: result.message });
    });
  }

  if (sent) {
    return (
      <div role="status" className="flex flex-col items-start gap-3 rounded-3xl bg-status-accessible-bg p-6 text-status-accessible-fg">
        <h2 ref={done} tabIndex={-1} className="flex items-center gap-2 font-heading text-xl font-bold">
          <Icon icon={IconCircleCheck} />
          {t("sentTitle")}
        </h2>
        <p className="text-text-primary">{t("sentBody")}</p>
        <Link href="/akun" className={buttonClass("outline", "sm")}>
          {t("back")}
        </Link>
      </div>
    );
  }

  const answerInvalid = error?.field === "jawaban";
  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        send();
      }}
    >
      <div className="flex flex-col gap-2">
        <label htmlFor="jawaban" className="font-semibold">
          {t("answerLabel")}
        </label>
        <p id="jawaban-petunjuk" className="text-text-secondary">
          {t("answerHint")}
        </p>
        <textarea
          ref={text}
          id="jawaban"
          rows={5}
          maxLength={1000}
          value={answer}
          onChange={(event) => setAnswer(event.target.value)}
          aria-invalid={answerInvalid || undefined}
          aria-describedby={`jawaban-petunjuk${answerInvalid ? " jawaban-galat" : ""}`}
          className={fieldClass(answerInvalid, "py-3")}
        />
        <FieldError id="jawaban-galat" message={answerInvalid ? error?.message : undefined} />
      </div>

      <fieldset className="flex min-w-0 flex-col gap-3">
        <legend className="mb-1 font-semibold">{t("photosTitle")}</legend>
        <p className="text-text-secondary">{t("photosHint", { count: remaining - photos.length })}</p>
        <ol className="flex flex-col gap-3">
          {photos.map((photo, index) => (
            <li key={photo.key} className="grid gap-3 rounded-2xl border-2 border-border-subtle p-3 sm:grid-cols-[7rem_1fr]">
              {/* eslint-disable-next-line @next/next/no-img-element -- pratinjau lokal dari blob */}
              <img src={photo.preview} alt={t("photo", { number: index + 1 })} className="aspect-4/3 w-full rounded-xl object-cover" />
              <div className="flex min-w-0 flex-col gap-2">
                <label className="flex flex-col gap-1 font-semibold">
                  {t("tag", { number: index + 1 })}
                  <select
                    value={photo.tag}
                    onChange={(event) => setPhotos((current) => current.map((item) => (item.key === photo.key ? { ...item, tag: event.target.value as PhotoTag } : item)))}
                    className={fieldClass(error?.message === t("tagMissing") && !photo.tag, "font-normal")}
                  >
                    <option value="">{t("tagEmpty")}</option>
                    {PHOTO_TAGS.map((tag) => (
                      <option key={tag} value={tag}>
                        {tags(tag)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 font-semibold">
                  {t("caption", { number: index + 1 })}
                  <input
                    type="text"
                    maxLength={200}
                    value={photo.caption}
                    onChange={(event) => setPhotos((current) => current.map((item) => (item.key === photo.key ? { ...item, caption: event.target.value } : item)))}
                    className={fieldClass(false, "font-normal")}
                  />
                </label>
                <button type="button" onClick={() => setPhotos((current) => current.filter((item) => item.key !== photo.key))} className={buttonClass("ghost", "sm", "self-start text-text-error")}>
                  <Icon icon={IconTrash} />
                  {t("remove", { number: index + 1 })}
                </button>
              </div>
            </li>
          ))}
        </ol>
        {photos.length < remaining && (
          <label className={buttonClass("outline", "sm", "relative self-start has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus-ring")}>
            <Icon icon={IconPhoto} />
            {t("add")}
            <input
              type="file"
              accept={ACCEPT_ATTRIBUTE}
              multiple
              disabled={busy}
              onChange={(event) => {
                if (event.target.files?.length) void add(event.target.files);
                event.target.value = "";
              }}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
          </label>
        )}
        <p role="status" className="text-sm font-semibold text-text-secondary">
          {status}
        </p>
      </fieldset>

      {error && !error.field && <FormAlert message={error.message} />}
      <button disabled={pending || busy} className={buttonClass("primary", "md", "self-start disabled:opacity-60")}>
        <Icon icon={IconSend} />
        {pending ? t("sending") : t("send")}
      </button>
    </form>
  );
}
