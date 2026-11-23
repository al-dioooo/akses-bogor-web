"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRef, useState, type FormEvent } from "react";
import { savePlace } from "@/app/(dasbor)/verifikasi/tempat/actions";
import { FieldError } from "@/components/akun/form-parts";
import { PickerMap } from "@/components/laporkan/picker-map";
import { uploadPhoto } from "@/components/laporkan/send";
import { StepFacilities } from "@/components/laporkan/step-facilities";
import { StepInfo } from "@/components/laporkan/step-info";
import { StepPhotos } from "@/components/laporkan/step-photos";
import { FACILITIES, type Category } from "@/lib/api";
import { checkFacilities, checkInfo, checkPhotos, newDraft, toPayload, type FieldError as StepError, type ReportDraft } from "@/lib/isian-laporan";
import { withoutEvidence, type AdminPlace, type Candidate } from "@/lib/kelola-tempat";
import type { LatLng } from "@/lib/laporan";
import { buttonClass } from "@/ui/button-styles";
import { fieldClass } from "@/ui/field-styles";
import { Icon } from "@/ui/icon";
import { IconAlertTriangle, IconCheck } from "@/ui/icons";

export type CandidateStart = { osm: { type: Candidate["osmType"]; id: number }; name: string | null; category: Category; point: LatLng };

const REASON_MAX = 500;

/** Draf formulir dari tempat yang diubah, atau dari kandidat OpenStreetMap untuk tempat baru. */
function startDraft(place: AdminPlace | null, candidate: CandidateStart | null): ReportDraft {
  const draft = newDraft("baru", null);
  if (!place) {
    if (!candidate) return draft;
    // Titik kandidat menjadi pin awal yang belum dikonfirmasi, seperti Laporkan dari Peta (ADR-0049).
    return { ...draft, name: candidate.name ?? "", category: candidate.category, osm: `${candidate.osm.type}/${candidate.osm.id}`, start: candidate.point };
  }
  const facilities = { ...draft.facilities };
  for (const f of place.facilities) facilities[f.facility] = { answer: f.answer, reason: f.reason, note: f.note ?? "" };
  return {
    ...draft,
    kind: "perubahan",
    placeId: place.id,
    name: place.name,
    category: place.category,
    landmark: place.landmark ?? "",
    description: place.description ?? "",
    location: { point: place.location, district: { slug: place.district.slug, name: place.district.name } },
    facilities,
  };
}

/**
 * Formulir tambah dan ubah tempat di Kelola tempat (ADR-0050), memakai bagian formulir Laporkan: informasi dan pemilih
 * pin, jawaban fasilitas, dan foto bertag. Jawaban Tersedia atau Tidak perlu tanpa foto yang sesuai diperingatkan di
 * sini dan disimpan API sebagai Belum diketahui. Alasan wajib dan masuk log audit.
 */
export function PlaceForm({ place, candidate }: { place: AdminPlace | null; candidate: CandidateStart | null }) {
  const t = useTranslations("KelolaTempat.form");
  const te = useTranslations("Laporkan.errors");
  const tf = useTranslations("Fasilitas");
  const router = useRouter();
  const [draft, setDraft] = useState(() => startDraft(place, candidate));
  const [removed, setRemoved] = useState<string[]>([]);
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<StepError[]>([]);
  const [reasonError, setReasonError] = useState(false);
  const [nearbyPending, setNearbyPending] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const problemRef = useRef<HTMLDivElement>(null);
  const update = (change: Partial<ReportDraft>) => setDraft((current) => ({ ...current, ...change }));

  const kept = (place?.photos ?? []).filter((photo) => !removed.includes(photo.id));
  const missing = withoutEvidence(
    FACILITIES.map((facility) => ({ facility, answer: draft.facilities[facility].answer })),
    [...kept.map((photo) => photo.tag), ...draft.photos.map((photo) => photo.tag)],
  );
  const missingText = missing.map((facility) => tf(facility)).join(", ");

  async function submit(event: FormEvent) {
    event.preventDefault();
    const found = [...checkInfo(draft), ...checkFacilities(draft), ...checkPhotos(draft)];
    if (nearbyPending) found.push({ field: "lokasi", message: "lokasiMirip" });
    const badReason = reason.trim().length < 5;
    setErrors(found);
    setReasonError(badReason);
    setProblem(null);
    if (found.length > 0 || badReason) {
      document.getElementById(found[0]?.field ?? "alasan")?.focus();
      return;
    }
    let photos = draft.photos;
    for (const [index, photo] of photos.entries()) {
      if (photo.uploadedId) continue;
      setProgress(t("uploading", { current: index + 1, total: photos.length }));
      const answer = await uploadPhoto(photo.blob, () => undefined);
      const id = answer.status === 201 && "id" in answer.body ? answer.body.id : null;
      if (!id) {
        setProgress(null);
        setProblem(answer.body.pesan ?? t("galat.foto"));
        requestAnimationFrame(() => problemRef.current?.focus());
        return;
      }
      photos = photos.map((p) => (p.key === photo.key ? { ...p, uploadedId: id } : p));
      setDraft((current) => ({ ...current, photos }));
    }
    setProgress(t("saving"));
    const payload = toPayload({ ...draft, photos });
    const input = {
      name: payload.name!,
      category: payload.category!,
      location: payload.location!,
      landmark: payload.landmark ?? null,
      description: payload.description ?? null,
      facilities: payload.facilities,
      photos: payload.photos,
      reason: reason.trim(),
    };
    const result = place
      ? await savePlace({ mode: "ubah", id: place.id, version: place.version, removePhotos: removed, place: input })
      : await savePlace({ mode: "baru", place: { ...input, ...(candidate ? { osm: candidate.osm } : {}) } });
    setProgress(null);
    if (!result.ok) {
      setProblem(result.message);
      requestAnimationFrame(() => problemRef.current?.focus());
      return;
    }
    const params = new URLSearchParams({ tersimpan: "1" });
    if (result.downgraded.length > 0) params.set("belum", result.downgraded.join(","));
    router.push(`/verifikasi/tempat/${result.placeId}?${params}`);
  }

  const section = "panel flex flex-col gap-5 rounded-3xl p-5 sm:p-6";
  return (
    <form noValidate onSubmit={submit} className="flex max-w-3xl flex-col gap-6">
      <section aria-labelledby="bagian-informasi" className={section}>
        <h2 id="bagian-informasi" className="font-heading text-xl font-bold">
          {t("infoTitle")}
        </h2>
        <StepInfo
          draft={draft}
          errors={errors}
          update={update}
          onNearbyPending={setNearbyPending}
          map={(point, move) => <PickerMap candidate={point} onMove={move} />}
        />
      </section>

      <section aria-labelledby="bagian-fasilitas" className={section}>
        <h2 id="bagian-fasilitas" className="font-heading text-xl font-bold">
          {t("facilitiesTitle")}
        </h2>
        <p className="text-text-secondary">{t("evidenceRule")}</p>
        <StepFacilities draft={draft} errors={errors} update={update} />
      </section>

      <section aria-labelledby="bagian-foto" className={section}>
        <h2 id="bagian-foto" className="font-heading text-xl font-bold">
          {t("photosTitle")}
        </h2>
        <p className="text-text-secondary">{t("photosPrivacy")}</p>
        {place && place.photos.length > 0 && (
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-2 font-semibold">{t("shownPhotos")}</legend>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {place.photos.map((photo) => (
                <li key={photo.id} className="flex flex-col gap-2">
                  {photo.url ? (
                    // eslint-disable-next-line @next/next/no-img-element -- foto dari bucket publik, ukurannya sudah diperkecil API.
                    <img src={photo.url} alt={photo.alt} className="aspect-[4/3] w-full rounded-2xl object-cover" />
                  ) : (
                    <span className="grid aspect-[4/3] place-items-center rounded-2xl bg-bg-sunken p-3 text-center text-sm text-text-secondary">{photo.alt}</span>
                  )}
                  <label className="flex min-h-11 items-center gap-2 font-semibold">
                    <input
                      type="checkbox"
                      className="size-5 accent-brand-fill"
                      checked={removed.includes(photo.id)}
                      onChange={(event) => setRemoved((current) => (event.target.checked ? [...current, photo.id] : current.filter((id) => id !== photo.id)))}
                    />
                    {t("removePhoto")}
                    <span className="sr-only">: {photo.alt}</span>
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
        )}
        <StepPhotos draft={draft} errors={errors} update={update} />
      </section>

      <section aria-labelledby="bagian-alasan" className={section}>
        <h2 id="bagian-alasan" className="font-heading text-xl font-bold">
          {t("reasonTitle")}
        </h2>
        <div className="flex flex-col gap-2">
          <label htmlFor="alasan" className="font-semibold">
            {t("reasonLabel")}
          </label>
          <p id="alasan-petunjuk" className="text-text-secondary">
            {t("reasonHint")}
          </p>
          <textarea
            id="alasan"
            value={reason}
            maxLength={REASON_MAX}
            rows={3}
            onChange={(event) => setReason(event.target.value)}
            aria-required="true"
            aria-invalid={reasonError || undefined}
            aria-describedby={reasonError ? "alasan-petunjuk alasan-galat" : "alasan-petunjuk"}
            className={fieldClass(reasonError, "py-3")}
          />
          <FieldError id="alasan-galat" message={reasonError ? t("reasonError") : undefined} />
        </div>
      </section>

      {missing.length > 0 && (
        <p className="flex gap-3 rounded-2xl bg-status-partial-bg p-4 text-status-partial-fg">
          <Icon icon={IconAlertTriangle} className="mt-0.5 size-5 shrink-0" />
          <span>{t("evidenceWarning", { facilities: missingText })}</span>
        </p>
      )}
      {errors.length > 0 && <p className="text-text-error">{te(errors[0]!.message, errors[0]!.values)}</p>}
      {problem && (
        <div ref={problemRef} tabIndex={-1} role="alert" className="rounded-2xl border-2 border-border-error p-4">
          {problem}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-4">
        <button disabled={progress !== null} className={buttonClass("primary", "md")}>
          <Icon icon={IconCheck} />
          {place ? t("saveChanges") : t("saveNew")}
        </button>
        {progress && (
          <p role="status" className="text-text-secondary">
            {progress}
          </p>
        )}
      </div>
    </form>
  );
}
