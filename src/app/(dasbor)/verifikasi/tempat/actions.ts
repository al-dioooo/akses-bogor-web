"use server";

import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ApiError, type Facility } from "@/lib/api";
import { createPlace, restorePlace, unpublishPlace, updatePlace, type PlaceInput } from "@/lib/kelola-tempat";
import { withReturn } from "@/lib/kembali";
import { sessionToken } from "@/lib/sesi";

// Simpan dari formulir Kelola tempat (ADR-0051). Server Action memeriksa asal permintaan sendiri; peran admin diperiksa API.

export type SaveOutcome = { ok: true; placeId: string; downgraded: Facility[] } | { ok: false; message: string; code: string };

export type SaveRequest =
  | { mode: "baru"; place: PlaceInput }
  | { mode: "ubah"; id: string; version: string; removePhotos: string[]; place: Omit<PlaceInput, "osm"> };

export async function savePlace(request: SaveRequest): Promise<SaveOutcome> {
  const back = request.mode === "baru" ? "/verifikasi/tempat/baru" : `/verifikasi/tempat/${request.id}/ubah`;
  const token = await sessionToken();
  if (!token) redirect(withReturn("/masuk", back));
  try {
    const saved =
      request.mode === "baru"
        ? await createPlace(token, request.place)
        : await updatePlace(token, request.id, { ...request.place, version: request.version, removePhotos: request.removePhotos });
    return { ok: true, placeId: saved.placeId, downgraded: saved.downgraded };
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
    if (error.status === 401) redirect(withReturn("/masuk/sesi-berakhir", back));
    const t = await getTranslations("KelolaTempat.form");
    return { ok: false, message: error.status > 0 ? error.message : t("galat.server"), code: error.galat };
  }
}

export type StateOutcome = { ok: true } | { ok: false; message: string };

/** Menurunkan atau menayangkan lagi tempat dengan alasan (ADR-0050). */
export async function changeState(id: string, action: "turunkan" | "tayangkan", reason: string): Promise<StateOutcome> {
  const back = `/verifikasi/tempat/${id}`;
  const token = await sessionToken();
  if (!token) redirect(withReturn("/masuk", back));
  try {
    if (action === "turunkan") await unpublishPlace(token, id, reason);
    else await restorePlace(token, id, reason);
    return { ok: true };
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
    if (error.status === 401) redirect(withReturn("/masuk/sesi-berakhir", back));
    const t = await getTranslations("KelolaTempat.form");
    return { ok: false, message: error.status > 0 ? error.message : t("galat.server") };
  }
}
