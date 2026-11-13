import { IconCirclePlus, IconCompass, IconHome, IconMap2, type Glyph } from "@/ui/icons";

// Menu dari nav bar desain (Referensi Figma, Frame DS v1). Semua tujuannya sudah ada. Label "Difabel" di Figma
// menjadi "Disabilitas" (/disabilitas), sesuai istilah UU No. 8 Tahun 2016 (ADR-0041).
export type NavKey = "beranda" | "jelajahi" | "peta" | "aksesibilitas" | "disabilitas" | "tips" | "tentang" | "laporkan";

export type NavItem = { key: NavKey; href: string };

export const MAIN_NAV: NavItem[] = [
  { key: "beranda", href: "/" },
  { key: "jelajahi", href: "/jelajahi" },
  { key: "peta", href: "/peta" },
  { key: "aksesibilitas", href: "/aksesibilitas" },
  { key: "disabilitas", href: "/disabilitas" },
  { key: "tips", href: "/tips" },
  { key: "tentang", href: "/tentang" },
];

/** Empat tab pertama Bottom nav; tab kelima, Lainnya, membuka menu sisanya. */
export const BOTTOM_NAV: (NavItem & { icon: Glyph })[] = [
  { key: "beranda", href: "/", icon: IconHome },
  { key: "jelajahi", href: "/jelajahi", icon: IconCompass },
  { key: "peta", href: "/peta", icon: IconMap2 },
  { key: "laporkan", href: "/laporkan", icon: IconCirclePlus },
];

export const MORE_NAV: NavItem[] = MAIN_NAV.filter((item) => !BOTTOM_NAV.some((tab) => tab.key === item.key));

/** Detail lokasi termasuk bagian Jelajahi. */
export function isActive(href: string, pathname: string | null) {
  if (!pathname) return false;
  if (href === "/") return pathname === "/";
  if (href === "/jelajahi" && pathname.startsWith("/lokasi/")) return true;
  return pathname === href || pathname.startsWith(`${href}/`);
}
