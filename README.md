# AksesBogor Web

Aplikasi web AksesBogor: informasi aksesibilitas fasilitas publik di Kota Bogor. Pengguna mencari tempat, melihat status pintu masuk dan fasilitasnya, lalu melaporkan tempat baru atau kekurangan. Dibuat mobile-first dan bisa dipasang sebagai PWA ([ADR-0012](https://github.com/al-dioooo/akses-bogor-docs/blob/main/decisions/0012-web-mobile-first-pwa.md)).

Keputusan produk dan teknis ada di [akses-bogor-docs](https://github.com/al-dioooo/akses-bogor-docs), termasuk [PRD](https://github.com/al-dioooo/akses-bogor-docs/blob/main/product/prd.md), [ADR](https://github.com/al-dioooo/akses-bogor-docs/tree/main/decisions), dan [referensi Figma](https://github.com/al-dioooo/akses-bogor-docs/blob/main/product/referensi-figma.md). Data diambil dari [akses-bogor-api](https://github.com/al-dioooo/akses-bogor-api).

## Tech Stack

| Bagian | Pilihan |
| --- | --- |
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Gaya | Tailwind CSS v4; token design system sebagai CSS variables |
| Bahasa | next-intl, satu locale `id` |
| Tes dan lint | Playwright + axe-core, ESLint dengan `jsx-a11y` strict |
| Hosting | Vercel |

Alasan pilihan ini ada di [ADR-0013](https://github.com/al-dioooo/akses-bogor-docs/blob/main/decisions/0013-tech-stack-nextjs-fastify.md).

## Menjalankan di Lokal

Butuh Node.js 22 atau lebih baru dan pnpm 12 (`corepack enable` memakai versi di `package.json`).

```bash
pnpm install
pnpm dev                                  # http://localhost:3000
pnpm exec playwright install chromium     # sekali saja, untuk pnpm test:a11y
```

| Skrip | Fungsi |
| --- | --- |
| `pnpm dev` | Server pengembangan |
| `pnpm lint` | ESLint, termasuk aturan aksesibilitas |
| `pnpm typecheck` | Pemeriksaan tipe, termasuk kunci di `messages/id.json` |
| `pnpm build` | Build produksi |
| `pnpm start` | Menjalankan hasil build |
| `pnpm test:a11y` | Build, lalu tes Playwright + axe-core di ponsel dan desktop |

## Environment Variables

Belum ada. Alamat API dan token publik Mapbox ditambahkan bersama fitur pertama yang memakainya, lengkap dengan `.env.example`. Jangan commit `.env*`.

## Bahasa dan Teks

Semua teks antarmuka ada di [messages/id.json](messages/id.json), ditulis dalam bahasa Indonesia yang sederhana ([ADR-0020](https://github.com/al-dioooo/akses-bogor-docs/blob/main/decisions/0020-antarmuka-bahasa-indonesia-siap-i18n.md)). Kunci yang salah ketik gagal saat `pnpm typecheck`.

## Aksesibilitas

Setiap halaman wajib memenuhi WCAG 2.2 level AA ([ADR-0021](https://github.com/al-dioooo/akses-bogor-docs/blob/main/decisions/0021-wcag-22-aa-dan-pengujian-berlapis.md)). Tambahkan setiap halaman baru ke `e2e/a11y.spec.ts`, dan isi checklist aksesibilitas di template PR.

## Arsitektur

Diagram, pengaturan bahasa, lapisan pengujian, dan struktur folder ada di [docs/arsitektur.md](docs/arsitektur.md).

## Deployment

Belum di-deploy. Rencananya proyek Vercel di akun pemilik repo membangun `main` secara otomatis, dengan preview untuk setiap PR. Paket Hobby Vercel hanya membangun commit dari pemilik akun, jadi [.github/workflows/redeploy.yml](.github/workflows/redeploy.yml) menambahkan commit kosong atas nama pemilik setiap kali orang lain mendorong ke `main`, seperti di lokerin.

## Kontribusi

Ikuti [AGENTS.md](AGENTS.md) dan [guideline tim](https://github.com/al-dioooo/akses-bogor-docs/tree/main/guidelines): issue, branch `feature/`, `fix/`, atau `chore/`, commit kecil dengan Conventional Commits, lalu PR dengan nomor issue di judul. CI menjalankan lint, typecheck, build, dan tes aksesibilitas di setiap PR.
