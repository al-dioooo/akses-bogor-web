import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getMe, type SignedIn, type User } from "./akun";
import { withReturn } from "./kembali";

// Sesi disimpan server web di cookie miliknya sendiri, bukan milik API (ADR-0029): HttpOnly, SameSite=Lax, dan di
// production Secure dengan awalan __Host- (tanpa Domain, Path=/). `next dev` di http memakai nama tanpa awalan.
const secure = process.env.NODE_ENV === "production";
const SESSION_COOKIE = secure ? "__Host-aksesbogor-sesi" : "aksesbogor-sesi";
const PENDING_COOKIE = secure ? "__Host-aksesbogor-masuk" : "aksesbogor-masuk";
const BASE = { httpOnly: true, secure, sameSite: "lax", path: "/" } as const;

/** Masa simpan email di antara langkah Masuk dan Kode Masuk; sedikit lebih lama dari masa berlaku kode. */
const PENDING_SECONDS = 15 * 60;

export async function sessionToken() {
  return (await cookies()).get(SESSION_COOKIE)?.value ?? null;
}

/** Hanya dipanggil dari Server Action atau Route Handler. */
export async function saveSession({ token, expiresAt }: Pick<SignedIn, "token" | "expiresAt">) {
  (await cookies()).set(SESSION_COOKIE, token, { ...BASE, expires: new Date(expiresAt) });
}

/** Cookie berawalan __Host- hanya bisa dihapus dengan atribut yang sama, jadi tidak memakai `cookies().delete`. */
export async function clearSession() {
  (await cookies()).set(SESSION_COOKIE, "", { ...BASE, maxAge: 0 });
}

/** Email yang sedang menunggu kode, dan kapan kode terakhir dikirim (milidetik sejak epoch). */
export type PendingSignIn = { email: string; sentAt: number };

export async function savePendingSignIn(pending: PendingSignIn) {
  (await cookies()).set(PENDING_COOKIE, JSON.stringify(pending), { ...BASE, maxAge: PENDING_SECONDS });
}

export async function pendingSignIn(): Promise<PendingSignIn | null> {
  const raw = (await cookies()).get(PENDING_COOKIE)?.value;
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<PendingSignIn>;
    return typeof value.email === "string" && typeof value.sentAt === "number" ? { email: value.email, sentAt: value.sentAt } : null;
  } catch {
    return null;
  }
}

/** Jeda sebelum kode baru boleh diminta (ADR-0014). */
export const RESEND_SECONDS = 60;

/** Sisa detik sampai kode baru boleh diminta, dihitung saat request. */
export function secondsUntilResend({ sentAt }: PendingSignIn) {
  return Math.max(0, RESEND_SECONDS - Math.floor((Date.now() - sentAt) / 1000));
}

export async function clearPendingSignIn() {
  (await cookies()).set(PENDING_COOKIE, "", { ...BASE, maxAge: 0 });
}

/** Ada cookie sesi. Dipakai header supaya tidak memanggil API di setiap halaman; isinya diperiksa saat dipakai. */
export async function hasSession() {
  return (await sessionToken()) !== null;
}

/**
 * Akun yang sedang masuk untuk halaman yang mewajibkan login. Tanpa sesi yang berlaku, pengguna diarahkan ke
 * /masuk/sesi-berakhir (cookie lama dihapus di sana) dan kembali ke `path` setelah masuk. Akun yang belum lengkap
 * diarahkan ke Lengkapi Akun kecuali `allowIncomplete`.
 */
export async function requireAccount(path: string, { allowIncomplete = false } = {}): Promise<{ token: string; user: User }> {
  const token = await sessionToken();
  if (!token) redirect(withReturn("/masuk", path));
  const user = await getMe(token);
  if (!user) redirect(withReturn("/masuk/sesi-berakhir", path));
  if (user.needsCompletion && !allowIncomplete) redirect(withReturn("/masuk/lengkapi", path));
  return { token, user };
}
