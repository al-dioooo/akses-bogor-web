"use server";

import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import type { FormState } from "@/components/akun/form-state";
import { requestCode, verifyCode, type SignedIn } from "@/lib/akun";
import { ApiError } from "@/lib/api";
import { AFTER_SIGN_IN, safeReturnPath, withReturn } from "@/lib/kembali";
import { normalizeCode } from "@/lib/kode";
import { RESEND_SECONDS, clearPendingSignIn, pendingSignIn, savePendingSignIn, saveSession } from "@/lib/sesi";

// Server Action untuk Masuk dan Kode Masuk (FR-10). Pesan galat dari API sudah berbahasa Indonesia untuk pengguna,
// jadi diteruskan apa adanya; galat jaringan dan validasi di sini memakai messages/id.json.

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

async function apiMessage(error: unknown) {
  if (error instanceof ApiError && error.status > 0 && error.status < 500) return error.message;
  if (error instanceof ApiError && error.status >= 500 && error.galat !== "galat_api") return error.message;
  return (await getTranslations("Masuk.galat"))("server");
}

/** Tujuan setelah masuk: Lengkapi Akun bila belum lengkap, lalu halaman asal (FR-20) atau Akun Saya. */
async function finishSignIn(signedIn: SignedIn, kembali: string | null): Promise<never> {
  await saveSession(signedIn);
  await clearPendingSignIn();
  redirect(signedIn.user.needsCompletion ? withReturn("/masuk/lengkapi", kembali) : (kembali ?? AFTER_SIGN_IN));
}

export async function sendCode(_state: FormState, form: FormData): Promise<FormState> {
  const t = await getTranslations("Masuk.galat");
  const email = String(form.get("email") ?? "").trim();
  const kembali = safeReturnPath(form.get("kembali"));
  const values = { email };
  if (!email) return { error: { field: "email", message: t("emailKosong") }, values };
  if (!EMAIL.test(email)) return { error: { field: "email", message: t("emailTidakValid") }, values };

  let sentAt = Date.now();
  try {
    await requestCode(email);
  } catch (error) {
    // Kode untuk email ini baru saja dikirim, mis. pengguna kembali dari layar kode: kode itu masih berlaku.
    if (error instanceof ApiError && error.galat === "kode_terlalu_sering" && error.retryAfterSeconds && error.retryAfterSeconds <= RESEND_SECONDS) {
      sentAt = Date.now() - (RESEND_SECONDS - error.retryAfterSeconds) * 1000;
    } else {
      return { error: { message: await apiMessage(error) }, values };
    }
  }
  await savePendingSignIn({ email: email.toLowerCase(), sentAt });
  redirect(withReturn("/masuk/kode", kembali));
}

export async function resendCode(): Promise<FormState> {
  const t = await getTranslations("KodeMasuk");
  const pending = await pendingSignIn();
  if (!pending) redirect("/masuk");
  try {
    await requestCode(pending.email);
  } catch (error) {
    const wait = error instanceof ApiError ? error.retryAfterSeconds : undefined;
    return { error: { message: await apiMessage(error) }, resendAfter: wait };
  }
  await savePendingSignIn({ email: pending.email, sentAt: Date.now() });
  return { notice: t("resent"), resendAfter: RESEND_SECONDS };
}

export async function checkCode(_state: FormState, form: FormData): Promise<FormState> {
  const t = await getTranslations("KodeMasuk.galat");
  const kembali = safeReturnPath(form.get("kembali"));
  const pending = await pendingSignIn();
  if (!pending) redirect(withReturn("/masuk", kembali));
  const typed = String(form.get("code") ?? "");
  const code = normalizeCode(typed);
  const values = { code: typed };
  if (!code) return { error: { field: "code", message: t("kodeKosong") }, values };
  if (!/^\d{6}$/.test(code)) return { error: { field: "code", message: t("kodeFormat") }, values };

  let signedIn: SignedIn;
  try {
    signedIn = await verifyCode(pending.email, code);
  } catch (error) {
    const field = error instanceof ApiError && error.galat.startsWith("kode_") ? "code" : undefined;
    return { error: { field, message: await apiMessage(error) }, values };
  }
  return finishSignIn(signedIn, kembali);
}
