"use server";

import { refresh } from "next/cache";
import { getTranslations } from "next-intl/server";
import type { FormState } from "@/components/akun/form-state";
import { ApiError } from "@/lib/api";
import { sessionToken } from "@/lib/sesi";
import { addVerifier, removeVerifier } from "@/lib/verifikasi";

// Tim verifikator (FR-36, ADR-0035). Hanya admin yang bisa; API memeriksa perannya.

export async function addTeamMember(_state: FormState, form: FormData): Promise<FormState> {
  const t = await getTranslations("Verifikasi.tim");
  const email = String(form.get("email") ?? "").trim();
  if (!email) return { error: { field: "email", message: t("emailEmpty") }, values: { email } };
  const token = await sessionToken();
  if (!token) return { error: { message: t("server") }, values: { email } };
  try {
    const member = await addVerifier(token, email);
    refresh();
    return { notice: t("added", { name: member.displayName }) };
  } catch (error) {
    const message = error instanceof ApiError && error.status > 0 ? error.message : t("server");
    return { error: { field: error instanceof ApiError && error.status === 400 ? "email" : undefined, message }, values: { email } };
  }
}

export async function removeTeamMember(_state: FormState, form: FormData): Promise<FormState> {
  const t = await getTranslations("Verifikasi.tim");
  const token = await sessionToken();
  if (!token) return { error: { message: t("server") } };
  try {
    await removeVerifier(token, String(form.get("userId") ?? ""));
    refresh();
    return { notice: t("removed", { name: String(form.get("name") ?? "") }) };
  } catch (error) {
    return { error: { message: error instanceof ApiError && error.status > 0 ? error.message : t("server") } };
  }
}
