<!--
Judul PR: <type>(<scope>): <deskripsi> (#<nomor-issue>)
Contoh:   feat(peta): show markers by status (#14)
-->

## Summary

<!-- Ringkasan singkat perubahan. -->

## Problem

<!-- Masalah atau kebutuhan yang dijawab PR ini. -->

## Solution

<!-- Apa yang ditambahkan atau diubah, dan alasannya. -->

## Test Evidence

<!-- Hasil pnpm lint, typecheck, dan test:a11y. Untuk perubahan UI: screenshot ponsel (360 px) dan desktop, alur normal dan kasus galat. -->

## Deployment Prerequisite / Breaking Changes

<!-- Environment variable baru di Vercel, perubahan URL, perubahan yang butuh API versi tertentu. Tulis "Tidak ada" bila tidak ada. -->

## Notes

<!-- Hal yang perlu difokuskan reviewer. -->

Closes #

### Checklist

- [ ] Judul PR memuat nomor issue
- [ ] `pnpm lint`, `pnpm typecheck`, dan `pnpm test:a11y` lulus
- [ ] Halaman baru ditambahkan ke daftar di `e2e/a11y.spec.ts`
- [ ] Teks baru ada di `messages/id.json`, bukan ditulis langsung di komponen

### Aksesibilitas (ADR-0021)

Untuk setiap perubahan UI:

- [ ] Semua fungsi bisa dipakai dengan keyboard saja, dengan urutan fokus yang masuk akal
- [ ] Cincin fokus terlihat dan tidak tertutup nav bar atau panel mengambang
- [ ] Tombol, tautan, dan kolom isian punya nama atau label yang jelas
- [ ] Tampilan utuh di lebar 320 px dan zoom 200%, tanpa gulir horizontal
- [ ] Target sentuh minimal 44 × 44 px
- [ ] Status ditulis sebagai teks + ikon + warna, bukan warna saja
- [ ] Animasi mengikuti `prefers-reduced-motion`
