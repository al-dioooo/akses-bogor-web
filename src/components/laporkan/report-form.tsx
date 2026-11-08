"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { FormAlert } from "@/components/akun/form-parts";
import type { PlaceDetail } from "@/lib/api";
import { deleteDraft, loadDraft, purgeExpiredDrafts, saveDraft } from "@/lib/draf";
import { checkStep, newDraft, STEPS, type FieldError, type ReportDraft, type Step } from "@/lib/isian-laporan";
import type { ReportKind } from "@/lib/laporan";
import { buttonClass } from "@/ui/button-styles";
import { Icon } from "@/ui/icon";
import { IconArrowLeft, IconArrowRight } from "@/ui/icons";
import { ErrorSummary, Stepper } from "./form-parts";
import { StepFacilities } from "./step-facilities";
import { StepInfo } from "./step-info";
import { StepPhotos } from "./step-photos";
import { StepSummary } from "./step-summary";

const NEXT: Record<Step, Step | null> = { "1": "2", "2": "3", "3": "ringkasan", ringkasan: null };
const PREVIOUS: Record<Step, Step | null> = { "1": null, "2": "1", "3": "2", ringkasan: "3" };
const SAVE_DELAY_MS = 300;

/**
 * Formulir Laporkan (FR-20 sampai FR-27). Langkah tercatat di URL (`?langkah=`), jadi Kembali dan Maju browser
 * berpindah langkah. Draf disimpan di IndexedDB setiap kali isian berubah dan dipulihkan saat halaman dibuka lagi,
 * termasuk setelah ke Masuk dan kembali (ADR-0033).
 */
export function ReportForm({ kind, place, signedIn }: { kind: ReportKind; place: PlaceDetail | null; signedIn: boolean }) {
  const t = useTranslations("Laporkan");
  const params = useSearchParams();
  const requested = params.get("langkah");
  const step: Step = STEPS.includes(requested as Step) ? (requested as Step) : "1";

  const [draft, setDraft] = useState<ReportDraft | null>(null);
  const [storage, setStorage] = useState<"ok" | "tidak-ada">("ok");
  const [notice, setNotice] = useState<"restored" | "deleted" | null>(null);
  const [checkedStep, setCheckedStep] = useState<Step | null>(null);
  const [nearbyPending, setNearbyPending] = useState(false);
  const changed = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const summary = useRef<HTMLDivElement>(null);
  const focusAfterRender = useRef<"judul" | "galat" | null>(null);
  const actionBar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const fresh = newDraft(kind, place);
      try {
        await purgeExpiredDrafts();
        const saved = await loadDraft(fresh.draftKey);
        if (cancelled) return;
        setDraft(saved ?? fresh);
        if (saved) setNotice("restored");
      } catch {
        if (cancelled) return;
        setStorage("tidak-ada");
        setDraft(fresh);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [kind, place]);

  // Simpan setelah isian berhenti berubah sebentar, dan langsung saat halaman disembunyikan atau ditutup.
  useEffect(() => {
    if (!draft || !changed.current || storage !== "ok") return;
    const save = () => saveDraft(draft).catch(() => setStorage("tidak-ada"));
    const timer = setTimeout(save, SAVE_DELAY_MS);
    const flush = () => {
      clearTimeout(timer);
      void save();
    };
    window.addEventListener("pagehide", flush);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("pagehide", flush);
    };
  }, [draft, storage]);

  const update = useCallback((change: Partial<ReportDraft>) => {
    changed.current = true;
    setDraft((current) => (current ? { ...current, ...change, updatedAt: Date.now() } : current));
  }, []);

  // Fokus keyboard tidak boleh tertutup Form action bar yang menempel di bawah layar ponsel (WCAG 2.4.11). Tidak semua
  // browser memakai scroll-padding saat fokus pindah, jadi halaman digulir sendiri secukupnya.
  useEffect(() => {
    const reveal = (event: FocusEvent) => {
      const bar = actionBar.current;
      const target = event.target;
      if (!bar || !(target instanceof HTMLElement) || bar.contains(target) || getComputedStyle(bar).position !== "fixed") return;
      const overlap = target.getBoundingClientRect().bottom - bar.getBoundingClientRect().top;
      if (overlap > 0) window.scrollBy({ top: overlap + 16 });
    };
    document.addEventListener("focusin", reveal);
    return () => document.removeEventListener("focusin", reveal);
  }, []);

  useEffect(() => {
    if (focusAfterRender.current === "judul") heading.current?.focus();
    if (focusAfterRender.current === "galat") summary.current?.focus();
    focusAfterRender.current = null;
  });

  const goTo = useCallback((next: Step) => {
    const url = new URL(window.location.href);
    url.searchParams.set("langkah", next);
    // pushState dibaca router Next.js, jadi useSearchParams ikut berubah tanpa memuat ulang halaman.
    window.history.pushState(null, "", url);
    focusAfterRender.current = "judul";
    window.scrollTo({ top: 0 });
  }, []);

  // Fokus juga pindah ke judul saat langkah berubah lewat tombol Kembali atau Maju browser.
  const lastStep = useRef(step);
  useEffect(() => {
    if (lastStep.current !== step && draft) heading.current?.focus();
    lastStep.current = step;
  }, [step, draft]);

  if (!draft) {
    return (
      <p role="status" className="rounded-3xl bg-bg-sunken p-6 text-text-secondary">
        {t("loading")}
      </p>
    );
  }

  const stepErrors = (target: Step): FieldError[] => {
    const errors = checkStep(target, draft);
    if (target === "1" && nearbyPending && !errors.some((e) => e.field === "lokasi")) errors.push({ field: "lokasi", message: "lokasiMirip" });
    return errors;
  };
  const errors = checkedStep === step ? stepErrors(step) : [];

  async function removeDraft() {
    await deleteDraft(draft!.draftKey).catch(() => undefined);
    changed.current = false;
    setDraft(newDraft(kind, place));
    setCheckedStep(null);
    setNotice("deleted");
    goTo("1");
  }

  function next() {
    const target = NEXT[step];
    if (!target) return;
    if (stepErrors(step).length) {
      setCheckedStep(step);
      focusAfterRender.current = "galat";
      return;
    }
    setCheckedStep(null);
    goTo(target);
  }

  const number = step === "ringkasan" ? null : step;
  const previous = PREVIOUS[step];
  return (
    <div className="flex flex-col gap-6">
      <Stepper step={step} complete={(target) => checkStep(target, draft).length === 0} />
      {storage !== "ok" && <FormAlert message={t("storageWarning")} />}
      <p role="status" className="empty:hidden">
        {notice === "restored" ? t("restored") : notice === "deleted" ? t("ringkasan.deleted") : ""}
      </p>
      <h2 ref={heading} tabIndex={-1} className="display text-[clamp(1.75rem,1.3rem+1.4vw,2.5rem)] leading-tight">
        {number ? t("steps.heading", { number, name: t(`steps.${number}`) }) : t("steps.ringkasan")}
      </h2>
      <ErrorSummary ref={summary} errors={errors} />

      {step === "1" && <StepInfo draft={draft} errors={errors} update={update} onNearbyPending={setNearbyPending} />}
      {step === "2" && <StepFacilities draft={draft} errors={errors} update={update} />}
      {step === "3" && <StepPhotos draft={draft} errors={errors} update={update} />}
      {step === "ringkasan" && <StepSummary draft={draft} signedIn={signedIn} goTo={goTo} onDelete={removeDraft} />}

      {/* Di ponsel, Form action bar menempel di bawah layar menggantikan Bottom nav (Frame Mobile). */}
      <div ref={actionBar} className="flex flex-wrap gap-3 max-lg:fixed max-lg:inset-x-0 max-lg:bottom-0 max-lg:z-30 max-lg:border-t max-lg:border-border-subtle max-lg:bg-bg-canvas max-lg:px-4 max-lg:pt-3 max-lg:pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:pt-2">
        {previous && (
          <button type="button" onClick={() => goTo(previous)} className={buttonClass("outline", "md", "max-lg:flex-1")}>
            <Icon icon={IconArrowLeft} />
            {t("actions.back")}
          </button>
        )}
        {NEXT[step] && (
          <button type="button" onClick={next} className={buttonClass("primary", "md", "max-lg:flex-[2]")}>
            {step === "3" ? t("actions.toSummary") : t("actions.next")}
            <Icon icon={IconArrowRight} />
          </button>
        )}
      </div>
    </div>
  );
}
