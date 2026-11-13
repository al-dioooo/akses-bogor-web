/**
 * Versi Kebijakan Privasi yang tampil di /kebijakan-privasi dan disetujui di Lengkapi Akun (FR-11). Harus sama dengan
 * `PRIVACY_POLICY_VERSION` di akses-bogor-api dan versi di akses-bogor-docs (product/kebijakan-privasi.md); API
 * menolak persetujuan untuk versi lain.
 */
export const PRIVACY_POLICY_VERSION = "2026-11-10";
export const PRIVACY_POLICY_PATH = "/kebijakan-privasi";

/**
 * Versi Syarat Layanan yang tampil di /syarat, sama dengan akses-bogor-docs (product/syarat-layanan.md). Disetujui lewat
 * tombol Lengkapi Akun dan tidak disimpan API (ADR-0040).
 */
export const TERMS_VERSION = "2026-11-10";
export const TERMS_PATH = "/syarat";
