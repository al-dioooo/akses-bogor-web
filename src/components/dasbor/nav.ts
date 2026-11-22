import type { Role } from "@/lib/akun";
import { IconClipboardCheck, IconLayoutDashboard, IconMessage, IconRefresh, IconRoute, IconUsers, type Glyph } from "@/ui/icons";

// Menu dasbor akun (ADR-0046). Bagian verifikasi dan admin hanya disusun untuk peran itu; halaman dan API tetap
// memeriksa peran sendiri (ADR-0035), jadi menu ini hanya memilih apa yang ditampilkan.

export type DashboardKey = "akun" | "bantu" | "antrean" | "jawaban" | "cekUlang" | "tim";
/** "utama" tidak berlabel: Ringkasan berdiri sendiri di atas bagian lain. */
export type DashboardGroupKey = "utama" | "kontribusi" | "verifikasi" | "admin";

export type DashboardItem = { key: DashboardKey; href: string; icon: Glyph };
export type DashboardGroup = { key: DashboardGroupKey; items: DashboardItem[] };

/** Bagian menu untuk peran akun. Bantu memetakan hanya muncul selama API membuka agen (ADR-0043). */
export function dashboardGroups({ role, agent }: { role: Role; agent: boolean }): DashboardGroup[] {
  const groups: DashboardGroup[] = [{ key: "utama", items: [{ key: "akun", href: "/akun", icon: IconLayoutDashboard }] }];
  if (agent) groups.push({ key: "kontribusi", items: [{ key: "bantu", href: "/laporkan/bantu-memetakan", icon: IconRoute }] });
  if (role === "verifikator" || role === "admin") {
    groups.push({
      key: "verifikasi",
      items: [
        { key: "antrean", href: "/verifikasi", icon: IconClipboardCheck },
        { key: "jawaban", href: "/verifikasi/jawaban", icon: IconMessage },
        { key: "cekUlang", href: "/verifikasi/cek-ulang", icon: IconRefresh },
      ],
    });
  }
  if (role === "admin") groups.push({ key: "admin", items: [{ key: "tim", href: "/verifikasi/tim", icon: IconUsers }] });
  return groups;
}

/** Halaman di bawah sebuah menu ikut menandai menu itu, mis. pemeriksaan laporan termasuk Antrean. */
const SUBPAGES: Partial<Record<DashboardKey, string[]>> = {
  akun: ["/akun/laporan/", "/akun/hapus"],
  antrean: ["/verifikasi/laporan/"],
};

/** Menu yang sedang dibuka. `pathname` kosong saat prerender, jadi belum ada yang aktif. */
export function isCurrent(item: DashboardItem, pathname: string | null) {
  if (!pathname) return false;
  if (pathname === item.href) return true;
  return (SUBPAGES[item.key] ?? []).some((prefix) => pathname.startsWith(prefix));
}

/** Inisial untuk avatar: huruf pertama dari dua kata pertama nama tampilan. */
export function initials(name: string) {
  const letters = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => Array.from(word)[0] ?? "");
  return letters.join("").toLocaleUpperCase("id-ID") || "?";
}
