"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { FACILITIES } from "@/lib/api";
import { FieldError } from "@/components/akun/form-parts";
import { firstIncompleteStep, type ReportDraft, type Step } from "@/lib/isian-laporan";
import { withoutEvidence } from "@/lib/kelola-tempat";
import { fieldClass } from "@/ui/field-styles";
import { buttonClass } from "@/ui/button-styles";
import { Icon } from "@/ui/icon";
import { IconAlertTriangle, IconInfoCircle, IconPencil, IconTrash } from "@/ui/icons";
import { ANSWER_ICON } from "@/ui/place-icons";

type Props = {
  draft: ReportDraft;
  signedIn: boolean;
  goTo: (step: Step) => void;
  onDelete: () => void;
  /** Akun admin: pilihan terbit langsung (ADR-0051). Peran diperiksa lagi di API. */
  admin?: boolean;
  update?: (change: Partial<ReportDraft>) => void;
  directError?: boolean;
};

/** Satu bagian ringkasan dengan tombol "Ubah" ke langkahnya. */
function Section({ id, title, step, goTo, children }: { id: string; title: string; step: Step; goTo: (step: Step) => void; children: ReactNode }) {
  const t = useTranslations("Laporkan.ringkasan");
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3 rounded-3xl border-2 border-border-subtle p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id={id} className="font-heading text-xl font-bold">
          {title}
        </h3>
        <button type="button" onClick={() => goTo(step)} className={buttonClass("ghost", "sm")}>
          <Icon icon={IconPencil} />
          {t("edit", { section: title })}
        </button>
      </div>
      {children}
    </section>
  );
}

/** Pasangan judul dan isi di ringkasan. */
function Row({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-sm font-semibold text-text-secondary">{term}</dt>
      <dd>{children}</dd>
    </div>
  );
}

/**
 * Ringkasan sebelum dikirim (FR-25): semua isian dengan tombol "Ubah" ke setiap langkah, peringatan bila ada langkah
 * yang belum lengkap, dan "Hapus draf" dengan konfirmasi.
 */
export function StepSummary({ draft, signedIn, goTo, onDelete, admin = false, update, directError = false }: Props) {
  const t = useTranslations("Laporkan.ringkasan");
  const tk = useTranslations("Kategori");
  const tf = useTranslations("Fasilitas");
  const ta = useTranslations("Alasan");
  const tj = useTranslations("Laporkan.fasilitas.answers");
  const tt = useTranslations("Laporkan.foto.tags");
  // Terbit langsung: fasilitas yang akan disimpan sebagai Belum diketahui karena belum ada foto yang sesuai.
  const missing = draft.publishDirectly ? withoutEvidence(FACILITIES.map((facility) => ({ facility, answer: draft.facilities[facility].answer })), draft.photos.map((photo) => photo.tag)) : [];
  const format = useFormatter();
  const [confirming, setConfirming] = useState(false);
  const incomplete = firstIncompleteStep(draft);
  const coordinate = (value: number) => format.number(value, { minimumFractionDigits: 5, maximumFractionDigits: 5 });

  return (
    <div className="flex flex-col gap-5">
      <p className="text-lg text-text-secondary">{t("intro")}</p>

      {incomplete && (
        <div className="flex flex-col items-start gap-3 rounded-2xl border-2 border-border-error p-4 text-text-error">
          <p className="flex items-center gap-2 font-bold">
            <Icon icon={IconAlertTriangle} />
            {t("incomplete", { step: incomplete })}
          </p>
          <button type="button" onClick={() => goTo(incomplete)} className={buttonClass("outline", "sm")}>
            {t("incompleteAction", { step: incomplete })}
          </button>
        </div>
      )}

      <Section id="ringkasan-info" title={t("infoTitle")} step="1" goTo={goTo}>
        <dl className="flex flex-col gap-3">
          <Row term={t("name")}>{draft.name.trim() || t("none")}</Row>
          <Row term={t("category")}>{draft.category ? tk(draft.category) : t("none")}</Row>
          <Row term={t("location")}>
            {draft.location
              ? t("locationValue", {
                  district: draft.location.district.name,
                  coordinates: `${coordinate(draft.location.point.lat)}, ${coordinate(draft.location.point.lng)}`,
                })
              : t("noLocation")}
          </Row>
          <Row term={t("landmark")}>{draft.landmark.trim() || t("none")}</Row>
        </dl>
      </Section>

      <Section id="ringkasan-fasilitas" title={t("facilitiesTitle")} step="2" goTo={goTo}>
        <dl className="flex flex-col gap-3">
          {FACILITIES.map((facility) => {
            const { answer, reason, note } = draft.facilities[facility];
            return (
              <Row key={facility} term={tf(facility)}>
                <span className="flex items-start gap-2 font-semibold">
                  <Icon icon={ANSWER_ICON[answer]} className="mt-0.5 size-5" />
                  {reason ? t("answerWithReason", { answer: tj(answer), reason: ta(reason) }) : t("answer", { answer: tj(answer) })}
                </span>
                {note.trim() && <span className="block text-text-secondary">{t("note", { note: note.trim() })}</span>}
              </Row>
            );
          })}
        </dl>
      </Section>

      <Section id="ringkasan-foto" title={t("photosTitle")} step="3" goTo={goTo}>
        <p className="font-semibold">{t("photoCount", { count: draft.photos.length })}</p>
        {draft.photos.length > 0 && (
          <ul className="flex flex-col gap-1">
            {draft.photos.map((photo, index) => (
              <li key={photo.key}>
                {t("photoItem", { number: index + 1, tag: photo.tag ? tt(photo.tag) : t("noTag") })}
                {photo.caption.trim() && <span className="text-text-secondary"> · {photo.caption.trim()}</span>}
              </li>
            ))}
          </ul>
        )}
        <dl>
          <Row term={t("description")}>
            <span className="whitespace-pre-line">{draft.description.trim() || t("none")}</span>
          </Row>
        </dl>
      </Section>

      {admin && signedIn && update && (
        <fieldset className="flex flex-col gap-3 rounded-2xl border-2 border-border-strong p-4 sm:p-5">
          <legend className="px-1 font-heading text-lg font-bold">{t("direct.legend")}</legend>
          <label className="flex min-h-11 items-start gap-3 font-semibold">
            <input
              type="checkbox"
              checked={Boolean(draft.publishDirectly)}
              onChange={(event) => update({ publishDirectly: event.target.checked })}
              aria-describedby="terbit-langsung-penjelasan"
              className="mt-0.5 size-6 shrink-0 accent-brand-fill"
            />
            {t("direct.label")}
          </label>
          <p id="terbit-langsung-penjelasan" className="text-text-secondary">
            {t("direct.body")}
          </p>
          {/* Fasilitas yang akan turun menjadi Belum diketahui, seperti peringatan di formulir Kelola tempat. */}
          <div role="status">
            {missing.length > 0 && (
              <p className="flex gap-3 rounded-2xl bg-status-partial-bg p-4 text-status-partial-fg">
                <Icon icon={IconAlertTriangle} className="mt-0.5 size-5 shrink-0" />
                <span>{t("direct.evidenceWarning", { facilities: missing.map((f) => tf(f)).join(", ") })}</span>
              </p>
            )}
          </div>
          {draft.publishDirectly && (
            <div className="flex flex-col gap-2">
              <label htmlFor="alasan-terbit" className="font-semibold">
                {t("direct.reasonLabel")}
              </label>
              <textarea
                id="alasan-terbit"
                value={draft.publishReason ?? ""}
                rows={3}
                maxLength={500}
                onChange={(event) => update({ publishReason: event.target.value })}
                aria-required="true"
                aria-invalid={directError || undefined}
                aria-describedby={directError ? "alasan-terbit-galat" : undefined}
                className={fieldClass(directError, "py-3")}
              />
              <FieldError id="alasan-terbit-galat" message={directError ? t("direct.reasonError") : undefined} />
            </div>
          )}
        </fieldset>
      )}

      {!signedIn && (
        <p className="flex items-start gap-2 rounded-2xl bg-bg-sunken p-4">
          <Icon icon={IconInfoCircle} className="mt-0.5 size-5 text-icon-brand" />
          {t("signInNotice")}
        </p>
      )}

      <div className="flex flex-col items-start gap-3 border-t border-border-subtle pt-4">
        {confirming ? (
          <>
            <p id="hapus-draf-tanya" className="font-semibold">
              {t("deleteConfirm")}
            </p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={onDelete} aria-describedby="hapus-draf-tanya" className={buttonClass("outline", "sm")}>
                <Icon icon={IconTrash} />
                {t("deleteYes")}
              </button>
              <button type="button" onClick={() => setConfirming(false)} className={buttonClass("ghost", "sm")}>
                {t("deleteNo")}
              </button>
            </div>
          </>
        ) : (
          <button type="button" onClick={() => setConfirming(true)} className={buttonClass("ghost", "sm")}>
            <Icon icon={IconTrash} />
            {t("deleteDraft")}
          </button>
        )}
      </div>
    </div>
  );
}
