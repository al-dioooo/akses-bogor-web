import { REPORT_STATUSES, type MyReport, type ReportStatus } from "./akun";
import type { Queue, RecheckItem } from "./verifikasi";
import { TARGET_WORKING_DAYS, daysWaiting, workingDaysWaiting } from "./verifikator";

// Angka untuk Ringkasan dasbor (ADR-0046), dihitung dari daftar yang sudah disediakan API. Fungsi di sini murni,
// jadi bisa dipakai komponen server dan diuji tanpa API.

/** Jumlah laporan per status, dari daftar Laporan saya (paling banyak 100 laporan terbaru). */
export function countByStatus(reports: MyReport[]): Record<ReportStatus, number> {
  const counts = Object.fromEntries(REPORT_STATUSES.map((status) => [status, 0])) as Record<ReportStatus, number>;
  for (const report of reports) counts[report.status] += 1;
  return counts;
}

/** Sisa hari kalender WIB sampai tenggat yang dianggap mendesak: hari ini, besok, atau lusa. */
export const URGENT_DAYS = 2;

export type OpenClarification = { report: MyReport; dueAt: string; daysLeft: number };

/** Pertanyaan verifikator yang masih bisa dijawab, tenggat terdekat dulu, dengan sisa hari kalender WIB (0 = hari ini). */
export function openClarifications(reports: MyReport[], now: Date): OpenClarification[] {
  return reports
    .flatMap((report) => {
      const dueAt = report.status === "klarifikasi" ? report.clarificationDueAt : null;
      if (!dueAt || new Date(dueAt) <= now) return [];
      return [{ report, dueAt, daysLeft: daysWaiting(now.toISOString(), new Date(dueAt)) }];
    })
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt));
}

export type DeskSummary = {
  queue: { total: number; oldest: { id: string; name: string; workingDays: number } | null; overdue: number; answered: number };
  waiting: { total: number; nextDueAt: string | null };
  recheck: { total: number; oldestVerifiedAt: string | null };
};

const earliest = (values: (string | null)[]) => values.filter((value): value is string => value !== null).sort()[0] ?? null;

/**
 * Ringkasan meja verifikasi. Jumlah memakai `total` dari API; laporan terlama, yang lewat target 3 hari kerja
 * (ADR-0019), dan yang sudah dijawab dihitung dari 100 laporan terlama yang dikirim API.
 */
export function deskSummary(queue: Queue, waiting: Queue, recheck: { total: number; items: RecheckItem[] }, now: Date): DeskSummary {
  const oldest = [...queue.items].sort((a, b) => a.submittedAt.localeCompare(b.submittedAt))[0];
  return {
    queue: {
      total: queue.total,
      oldest: oldest ? { id: oldest.id, name: oldest.name, workingDays: workingDaysWaiting(oldest.submittedAt, now) } : null,
      overdue: queue.items.filter((item) => workingDaysWaiting(item.submittedAt, now) > TARGET_WORKING_DAYS).length,
      answered: queue.items.filter((item) => item.answered).length,
    },
    waiting: { total: waiting.total, nextDueAt: earliest(waiting.items.map((item) => item.clarificationDueAt)) },
    recheck: { total: recheck.total, oldestVerifiedAt: earliest(recheck.items.map((item) => item.lastVerifiedAt)) },
  };
}

/** Kata pertama nama tampilan, untuk sapaan. */
export const firstName = (displayName: string) => displayName.trim().split(/\s+/)[0] ?? displayName;
