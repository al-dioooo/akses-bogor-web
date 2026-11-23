import { IconCirclePlus, IconCompass, IconHome, IconMap2, type Glyph } from "@/ui/icons";

// Menu dari nav bar desain (Referensi Figma, Frame DS v1). Semua tujuannya sudah ada. Halaman Disabilitas dan Tips
// dihapus dan dialihkan ke Aksesibilitas (issue #200, next.config.ts). "Tanya rute" (/tanya-rute), asisten rute publik
// (ADR-0050), belum ada di Figma, jadi ada di menu Lainnya ponsel, footer, dan Beranda.
export type NavKey = "beranda" | "jelajahi" | "peta" | "tanyaRute" | "aksesibilitas" | "tentang" | "laporkan";

export type NavItem = { key: NavKey; href: string };

/** Peta langsung setelah Beranda, sebelum Jelajahi (issue #198), di semua menu. */
export const MAIN_NAV: NavItem[] = [
  { key: "beranda", href: "/" },
  { key: "peta", href: "/peta" },
  { key: "jelajahi", href: "/jelajahi" },
  { key: "aksesibilitas", href: "/aksesibilitas" },
  { key: "tentang", href: "/tentang" },
];

/** Empat tab pertama Bottom nav; tab kelima, Lainnya, membuka menu sisanya. */
export const BOTTOM_NAV: (NavItem & { icon: Glyph })[] = [
  { key: "beranda", href: "/", icon: IconHome },
  { key: "peta", href: "/peta", icon: IconMap2 },
  { key: "jelajahi", href: "/jelajahi", icon: IconCompass },
  { key: "laporkan", href: "/laporkan", icon: IconCirclePlus },
];

export const MORE_NAV: NavItem[] = [
  { key: "tanyaRute", href: "/tanya-rute" },
  ...MAIN_NAV.filter((item) => !BOTTOM_NAV.some((tab) => tab.key === item.key)),
];

/** Detail lokasi termasuk bagian Jelajahi. */
export function isActive(href: string, pathname: string | null) {
  if (!pathname) return false;
  if (href === "/") return pathname === "/";
  if (href === "/jelajahi" && pathname.startsWith("/lokasi/")) return true;
  return pathname === href || pathname.startsWith(`${href}/`);
}
