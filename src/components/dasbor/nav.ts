import type { Role } from "@/lib/akun";
import { IconBuilding, IconClipboardCheck, IconLayoutDashboard, IconMessage, IconMessageReport, IconRefresh, IconRoute, IconSettings, IconUsers, type Glyph } from "@/ui/icons";

// Menu dasbor akun (ADR-0046). Bagian verifikasi dan admin hanya disusun untuk peran itu; halaman dan API tetap
// memeriksa peran sendiri (ADR-0035), jadi menu ini hanya memilih apa yang ditampilkan.

export type DashboardKey = "ringkasan" | "laporan" | "bantu" | "antrean" | "jawaban" | "cekUlang" | "tempat" | "tim" | "pengaturan";
/** "utama" tidak berlabel: Ringkasan berdiri sendiri di atas bagian lain. */
export type DashboardGroupKey = "utama" | "kontribusi" | "verifikasi" | "admin" | "akun";

export type DashboardItem = { key: DashboardKey; href: string; icon: Glyph };
export type DashboardGroup = { key: DashboardGroupKey; items: DashboardItem[] };

/** Bagian menu untuk peran akun. Bantu memetakan hanya muncul selama API membuka agen (ADR-0043). */
export function dashboardGroups({ role, agent }: { role: Role; agent: boolean }): DashboardGroup[] {
  const groups: DashboardGroup[] = [
    { key: "utama", items: [{ key: "ringkasan", href: "/akun", icon: IconLayoutDashboard }] },
    {
      key: "kontribusi",
      items: [
        { key: "laporan", href: "/akun/laporan", icon: IconMessageReport },
        ...(agent ? [{ key: "bantu" as const, href: "/laporkan/bantu-memetakan", icon: IconRoute }] : []),
      ],
    },
  ];
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
  if (role === "admin") {
    groups.push({
      key: "admin",
      items: [
        { key: "tempat", href: "/verifikasi/tempat", icon: IconBuilding },
        { key: "tim", href: "/verifikasi/tim", icon: IconUsers },
      ],
    });
  }
  groups.push({ key: "akun", items: [{ key: "pengaturan", href: "/akun/pengaturan", icon: IconSettings }] });
  return groups;
}

/** Halaman di bawah sebuah menu ikut menandai menu itu, mis. pemeriksaan laporan termasuk Antrean. */
const SUBPAGES: Partial<Record<DashboardKey, string[]>> = {
  laporan: ["/akun/laporan/"],
  antrean: ["/verifikasi/laporan/"],
  tempat: ["/verifikasi/tempat/"],
  pengaturan: ["/akun/hapus"],
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
