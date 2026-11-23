/**
 * Halaman edukasi (FR-51, ADR-0041), urut seperti di nav. Halaman baru ditambahkan di sini supaya ikut muncul di
 * bagian "Baca juga" halaman edukasi lain.
 *
 * Halaman Disabilitas dan Tips dihapus (issue #200), tetapi namespace `Disabilitas` dan `Tips` di `messages/id.json`
 * tetap ada: `pnpm pengetahuan:dokumen` di akses-bogor-api membacanya dari cabang `main` repo ini untuk basis
 * pengetahuan agen rute. Hapus setelah skrip itu tidak membacanya lagi.
 */
export const EDU_PAGES = [{ href: "/aksesibilitas", namespace: "Aksesibilitas" }] as const;

export type EduNamespace = (typeof EDU_PAGES)[number]["namespace"];

/** Satu sumber di daftar Sumber: teksnya, dan tautan ke teks aslinya bila ada. */
export type EduSource = { text: string; link?: string; href?: string };
