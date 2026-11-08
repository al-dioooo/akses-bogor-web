"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import type { Review } from "@/lib/verifikasi";
import { AnswerCheck } from "./answer-check";
import { ClarificationThread } from "./clarification-thread";
import { decisionProblems, initialDecision } from "./decision";
import { DecisionActions } from "./decision-actions";
import { DecisionSummary } from "./decision-summary";
import { FacilityCompare } from "./facility-compare";
import { SheetHeading } from "./parts";
import { PhotoGallery } from "./photo-gallery";
import { PhotoModeration } from "./photo-moderation";
import { DescriptionEdit, PlaceEdit } from "./place-edit";
import { PlaceFacts } from "./place-facts";

/**
 * Lembar periksa (FR-31, FR-33): bagian bernomor mengikuti urutan Panduan Verifikasi bagian 3, dengan daftar bagian
 * dan pratinjau status yang menempel di samping pada layar lebar. Laporan yang sudah diputuskan hanya bisa dibaca.
 */
export function ReviewSheet({ review }: { review: Review }) {
  const t = useTranslations("Pemeriksaan");
  const [decision, setDecision] = useState(() => initialDecision(review));
  const problems = decisionProblems(review, decision);
  const open = review.status === "menunggu" || review.status === "klarifikasi";
  const update = (change: Partial<typeof decision>) => setDecision((current) => ({ ...current, ...change }));
  // Foto setelah moderasi, dan versinya supaya pratinjau kabur dimuat ulang (ADR-0037).
  const [photos, setPhotos] = useState(review.photos);
  const [versions, setVersions] = useState<Record<string, number>>({});
  const savePhoto = (photo: (typeof photos)[number]) => {
    setPhotos((current) => current.map((item) => (item.id === photo.id ? photo : item)));
    setVersions((current) => ({ ...current, [photo.id]: (current[photo.id] ?? 0) + 1 }));
  };
  const sections = [
    { id: "tempat", title: t("place.title") },
    { id: "fasilitas", title: t("facilities.title") },
    { id: "foto", title: t("photos.title") },
    { id: "deskripsi", title: t("description.title") },
    ...(review.clarifications.length ? [{ id: "klarifikasi", title: t("clarifications.title") }] : []),
    ...(open ? [{ id: "keputusan", title: t("result.title") }] : []),
  ];
  return (
    <div className="grid items-start gap-10 lg:grid-cols-[13rem_minmax(0,1fr)]">
      <div className="flex flex-col gap-6 max-lg:hidden lg:sticky lg:top-24">
        <nav aria-label={t("index")}>
          <ol className="flex flex-col gap-1 border-l-2 border-border-subtle">
            {sections.map((section, index) => (
              <li key={section.id}>
                <a href={`#${section.id}`} className="-ml-0.5 flex min-h-11 items-center gap-3 border-l-2 border-transparent pl-4 font-semibold hover:border-border-strong">
                  <span className="font-mono text-sm text-text-secondary">{index + 1}</span>
                  {section.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>
        {open && (
          <div className="rounded-3xl border-2 border-border-subtle bg-surface-raised p-4">
            <DecisionSummary decision={decision} problems={problems} compact />
          </div>
        )}
      </div>
      <div className="flex min-w-0 flex-col gap-12">
        <section id="tempat" aria-labelledby="judul-tempat" className="flex scroll-mt-24 flex-col gap-5">
          <SheetHeading id="judul-tempat" number={1} title={t("place.title")} />
          <PlaceFacts review={review} />
          {open && review.kind !== "kekurangan" && <PlaceEdit review={review} decision={decision} update={update} />}
        </section>
        <section id="fasilitas" aria-labelledby="judul-fasilitas" className="flex scroll-mt-24 flex-col gap-5">
          <SheetHeading id="judul-fasilitas" number={2} title={t("facilities.title")}>
            {t("facilities.intro")}
          </SheetHeading>
          <FacilityCompare
            review={review}
            decision={
              open
                ? (facility) => (
                    <AnswerCheck
                      facility={facility}
                      value={decision.facilities[facility]}
                      onChange={(next) => setDecision((current) => ({ ...current, facilities: { ...current.facilities, [facility]: next } }))}
                    />
                  )
                : undefined
            }
          />
        </section>
        <section id="foto" aria-labelledby="judul-foto" className="flex scroll-mt-24 flex-col gap-5">
          <SheetHeading id="judul-foto" number={3} title={t("photos.title")}>
            {t("photos.count", { count: review.photos.length })}
          </SheetHeading>
          <PhotoGallery
            review={review}
            photos={photos}
            versions={versions}
            controls={open ? (photo, index) => <PhotoModeration reportId={review.id} photo={photo} number={index + 1} onSaved={savePhoto} /> : undefined}
          />
        </section>
        <section id="deskripsi" aria-labelledby="judul-deskripsi" className="flex scroll-mt-24 flex-col gap-5">
          <SheetHeading id="judul-deskripsi" number={4} title={t("description.title")} />
          <p className="rounded-2xl bg-bg-sunken p-4 break-words whitespace-pre-line">{review.submission.description ?? t("description.empty")}</p>
          {open && <DescriptionEdit value={decision.description} onValue={(description) => update({ description })} />}
        </section>
        {review.clarifications.length > 0 && (
          <section id="klarifikasi" aria-labelledby="judul-klarifikasi" className="flex scroll-mt-24 flex-col gap-5">
            <SheetHeading id="judul-klarifikasi" number={5} title={t("clarifications.title")} />
            <ClarificationThread items={review.clarifications} />
          </section>
        )}
        {open && (
          <section id="keputusan" aria-labelledby="judul-keputusan" className="flex scroll-mt-24 flex-col gap-5">
            <SheetHeading id="judul-keputusan" number={sections.length} title={t("result.title")} />
            <div className="rounded-3xl border-2 border-border-strong p-4 sm:p-6">
              <DecisionSummary decision={decision} problems={problems} />
            </div>
            <DecisionActions review={review} decision={decision} problems={problems} onNote={(note) => update({ note })} />
          </section>
        )}
      </div>
    </div>
  );
}
