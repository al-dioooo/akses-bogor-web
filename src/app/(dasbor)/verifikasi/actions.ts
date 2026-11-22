"use server";

import { getTranslations } from "next-intl/server";
import { ApiError } from "@/lib/api";
import { sessionToken } from "@/lib/sesi";
import { clarifyReport, moderatePhoto, publishReport, rejectReport, type ModerationPatch, type PublishInput, type RejectionReason, type ReviewPhoto } from "@/lib/verifikasi";

// Keputusan verifikator (FR-32, ADR-0036), dipanggil dari halaman pemeriksaan. Sesi, peran, laporan sendiri, dan
// keputusan ganda diperiksa API; galatnya diteruskan dengan pesan dari API.

export type DecisionResult =
  | { ok: true; status: "diterbitkan" | "klarifikasi" | "ditolak"; placeId?: string; clarificationDueAt?: string }
  | { ok: false; code: string; message: string };

async function decide(run: (token: string) => Promise<Omit<Extract<DecisionResult, { ok: true }>, "ok">>): Promise<DecisionResult> {
  const t = await getTranslations("Pemeriksaan.actions");
  const token = await sessionToken();
  if (!token) return { ok: false, code: "belum_masuk", message: t("server") };
  try {
    // Halaman tidak dimuat ulang di sini, supaya hasil keputusan tetap tampil; antrean dimuat ulang saat dibuka lagi.
    return { ok: true, ...(await run(token)) };
  } catch (error) {
    if (error instanceof ApiError && error.status > 0) return { ok: false, code: error.galat, message: error.message };
    return { ok: false, code: "api_tidak_terhubung", message: t("server") };
  }
}

export async function publishDecision(id: string, input: PublishInput) {
  return decide(async (token) => {
    const { placeId } = await publishReport(token, id, input);
    return { status: "diterbitkan", placeId };
  });
}

export async function clarifyDecision(id: string, question: string, note: string) {
  return decide(async (token) => {
    const { clarificationDueAt } = await clarifyReport(token, id, { question, ...(note.trim() ? { note: note.trim() } : {}) });
    return { status: "klarifikasi", clarificationDueAt };
  });
}

export async function rejectDecision(id: string, reason: RejectionReason, note: string) {
  return decide(async (token) => {
    await rejectReport(token, id, { reason, ...(note.trim() ? { note: note.trim() } : {}) });
    return { status: "ditolak" };
  });
}

export type ModerationResult = { ok: true; photo: ReviewPhoto } | { ok: false; code: string; message: string };

/** Moderasi satu foto sebelum keputusan (FR-34, ADR-0037): tag, keterangan, sembunyikan, atau area kabur. */
export async function moderateReportPhoto(reportId: string, photoId: string, patch: ModerationPatch): Promise<ModerationResult> {
  const t = await getTranslations("Pemeriksaan.actions");
  const token = await sessionToken();
  if (!token) return { ok: false, code: "belum_masuk", message: t("server") };
  try {
    return { ok: true, photo: await moderatePhoto(token, reportId, photoId, patch) };
  } catch (error) {
    if (error instanceof ApiError && error.status > 0) return { ok: false, code: error.galat, message: error.message };
    return { ok: false, code: "api_tidak_terhubung", message: t("server") };
  }
}
