import { requireAccount } from "./sesi";

// Bantuan server untuk panel verifikator (ADR-0035). Pemeriksaan yang mengikat ada di API; di sini hanya untuk memilih
// apa yang ditampilkan.

/** Sesi verifikator atau admin, atau `null` bila akunnya pengguna biasa. Tanpa sesi diarahkan ke Masuk. */
export async function verifierSession(path: string) {
  const session = await requireAccount(path);
  return session.user.role === "pengguna" ? null : session;
}

const DAY_MS = 24 * 60 * 60 * 1000;
/** Hari dalam zona WIB, supaya pergantian hari mengikuti Bogor. */
const wibDay = (date: Date) => Math.floor((date.getTime() + 7 * 60 * 60 * 1000) / DAY_MS);

/** Hari kalender sejak laporan dikirim, dalam WIB. */
export const daysWaiting = (since: string, now: Date) => Math.max(0, wibDay(now) - wibDay(new Date(since)));

/** Hari kerja (Senin sampai Jumat) sejak laporan dikirim, untuk target keputusan 3 hari kerja (ADR-0019). */
export function workingDaysWaiting(since: string, now: Date) {
  let count = 0;
  for (let day = wibDay(new Date(since)) + 1; day <= wibDay(now); day++) {
    // Hari ke-0 sejak epoch adalah Kamis.
    const weekday = (day + 4) % 7;
    if (weekday !== 0 && weekday !== 6) count += 1;
  }
  return count;
}

/** Target keputusan dalam hari kerja (ADR-0019). */
export const TARGET_WORKING_DAYS = 3;
