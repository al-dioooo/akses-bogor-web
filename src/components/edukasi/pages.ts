/**
 * Halaman edukasi (FR-51, ADR-0041), urut seperti di nav. Halaman baru ditambahkan di sini supaya ikut muncul di
 * bagian "Baca juga" halaman edukasi lain.
 */
export const EDU_PAGES = [
  { href: "/aksesibilitas", namespace: "Aksesibilitas" },
  { href: "/disabilitas", namespace: "Disabilitas" },
  { href: "/tips", namespace: "Tips" },
] as const;

export type EduNamespace = (typeof EDU_PAGES)[number]["namespace"];

/** Satu sumber di daftar Sumber: teksnya, dan tautan ke teks aslinya bila ada. */
export type EduSource = { text: string; link?: string; href?: string };
