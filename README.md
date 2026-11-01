# AksesBogor Web

Aplikasi web AksesBogor: informasi aksesibilitas fasilitas publik di Kota Bogor. Pengguna mencari tempat, melihat status pintu masuk dan fasilitasnya, lalu melaporkan tempat baru atau kekurangan. Dibuat mobile-first dan bisa dipasang sebagai PWA ([ADR-0012](https://github.com/al-dioooo/akses-bogor-docs/blob/main/decisions/0012-web-mobile-first-pwa.md)).

Keputusan produk dan teknis ada di [akses-bogor-docs](https://github.com/al-dioooo/akses-bogor-docs), termasuk [PRD](https://github.com/al-dioooo/akses-bogor-docs/blob/main/product/prd.md), [ADR](https://github.com/al-dioooo/akses-bogor-docs/tree/main/decisions), dan [referensi Figma](https://github.com/al-dioooo/akses-bogor-docs/blob/main/product/referensi-figma.md). Data diambil dari [akses-bogor-api](https://github.com/al-dioooo/akses-bogor-api).

## Tech Stack

| Bagian | Pilihan |
| --- | --- |
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Gaya | Tailwind CSS v4; token design system Figma sebagai CSS variables dan utility |
| Bahasa | next-intl, satu locale `id` |
| Tes dan lint | Playwright + axe-core, ESLint dengan `jsx-a11y` strict |
| Hosting | Vercel |

Alasan pilihan ini ada di [ADR-0013](https://github.com/al-dioooo/akses-bogor-docs/blob/main/decisions/0013-tech-stack-nextjs-fastify.md).

## Menjalankan di Lokal

Butuh Node.js 24 atau lebih baru dan pnpm 12 (`corepack enable` memakai versi di `package.json`).

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
| `pnpm tokens` | Menulis ulang `src/app/tokens.css` dari ekspor variable Figma |
| `pnpm test:a11y` | Build, lalu tes Playwright + axe-core di ponsel dan desktop, dengan data dari API tiruan di `e2e/mock-api` |

## Environment Variables

Contoh ada di [.env.example](.env.example); salin ke `.env.local`. Jangan commit `.env*`.

| Variabel | Wajib | Keterangan |
| --- | --- | --- |
| `API_URL` | Ya | Alamat [akses-bogor-api](https://github.com/al-dioooo/akses-bogor-api), mis. `http://localhost:8080`. Hanya dibaca di server; browser tidak pernah memanggil API langsung |
| `ENABLE_EXPERIMENTAL_COREPACK` | Di Vercel | `1`, supaya Vercel memakai versi pnpm dari `packageManager` di `package.json` |

Token publik Mapbox ditambahkan bersama halaman Peta.

## Token Design System

Warna, spasi, radius, dan ukuran berasal dari variable design system ([ADR-0027](https://github.com/al-dioooo/akses-bogor-docs/blob/main/decisions/0027-design-system-datar-dan-ilustrasi-3d.md)). Nama CSS-nya sama dengan code syntax di Figma: `color/text/primary` menjadi `--color-text-primary`. Snapshot versi 2 diubah langsung di repo ini; variable di [Figma](https://www.figma.com/design/aTaMQUxVF2P1zQlJY3s4du/AksesBogor?node-id=1-2) masih versi 1 dan diperbarui menyusul.

| Berkas | Isi |
| --- | --- |
| [design-tokens/figma-variables.json](design-tokens/figma-variables.json) | Snapshot variable, satu variable per baris |
| [src/app/tokens.css](src/app/tokens.css) | CSS hasil `pnpm tokens`; jangan diubah langsung |
| [scripts/tokens.mjs](scripts/tokens.mjs) | Generator CSS |
| [scripts/figma/export-variables.js](scripts/figma/export-variables.js) | Skrip ekspor yang dijalankan di file Figma |

Mode warna:

| Mode | Aktif saat |
| --- | --- |
| Terang | Bawaan |
| Gelap | `prefers-color-scheme: dark` |

`<html data-theme="terang|gelap">` mengalahkan preferensi sistem; dipasang oleh pengaturan tampilan di header dan dipakai di pengujian.

Token warna dan radius juga menjadi utility Tailwind dengan nama token, misalnya `bg-bg-canvas`, `bg-surface-raised`, `text-text-primary`, `border-border-subtle`, dan `rounded-lg`. Palet, radius, dan blur bawaan Tailwind dimatikan supaya hanya token yang terpakai. Token lain dipakai lewat variable, misalnya `p-(--spacing-md)`, `gap-(--spacing-lg)`, `size-(--size-control-md)`, atau `border-(length:--border-width-focus)`. Spasi sengaja tidak dijadikan utility bernama (`p-md`), karena Tailwind juga membaca `--spacing-*` untuk `max-w-*` dan `w-*`, sehingga `--spacing-2xl` akan mengubah arti `max-w-2xl`.

Memperbarui token:

1. Ubah `design-tokens/figma-variables.json`. Setelah variable Figma diperbarui ke versi 2, snapshot kembali diambil dari Figma: jalankan isi `scripts/figma/export-variables.js` di file Figma AksesBogor lewat Figma MCP (`use_figma`) atau plugin pengembangan, lalu simpan JSON-nya dengan objek `source` yang lama dan tanggal `exportedAt` yang baru.
2. Jalankan `pnpm tokens`, periksa diff kedua berkas, lalu commit. CI gagal bila `tokens.css` tidak sesuai snapshot.

Text style dan effect style Figma (tipografi, bayangan) belum diekspor karena bukan variable.

## Bahasa dan Teks

Semua teks antarmuka ada di [messages/id.json](messages/id.json), ditulis dalam bahasa Indonesia yang sederhana ([ADR-0020](https://github.com/al-dioooo/akses-bogor-docs/blob/main/decisions/0020-antarmuka-bahasa-indonesia-siap-i18n.md)). Kunci yang salah ketik gagal saat `pnpm typecheck`.

## Aksesibilitas

Setiap halaman wajib memenuhi WCAG 2.2 level AA ([ADR-0021](https://github.com/al-dioooo/akses-bogor-docs/blob/main/decisions/0021-wcag-22-aa-dan-pengujian-berlapis.md)). Tambahkan setiap halaman baru ke `e2e/a11y.spec.ts`, dan isi checklist aksesibilitas di template PR.

## Arsitektur

Diagram, pengaturan bahasa, lapisan pengujian, dan struktur folder ada di [docs/arsitektur.md](docs/arsitektur.md).

## Deployment

Proyek Vercel di akun pemilik repo ([ADR-0013](https://github.com/al-dioooo/akses-bogor-docs/blob/main/decisions/0013-tech-stack-nextjs-fastify.md)). API produksi ada di `https://akses-bogor-api.yorhagarden.xyz` ([ADR-0026](https://github.com/al-dioooo/akses-bogor-docs/blob/main/decisions/0026-api-dan-postgresql-di-evergarden-oci.md)).

| Pengaturan Vercel | Nilai |
| --- | --- |
| Framework Preset | Next.js, dengan perintah install, build, dan output bawaan |
| Root Directory | `./` |
| Production Branch | `release` (Settings → Environments → Production) |
| Node.js Version | 24.x, sama dengan `.nvmrc` |
| Environment Variables | `API_URL` = `https://akses-bogor-api.yorhagarden.xyz` dan `ENABLE_EXPERIMENTAL_COREPACK` = `1`, untuk Production dan Preview |

- Rilis berarti merge `main` ke `release` lewat PR, sama seperti API. Push ke branch lain, termasuk `main`, menjadi preview deployment.
- Preview deployment hanya bisa dibuka anggota proyek di Vercel. Tim membuka alamat produksi proyek (`*.vercel.app`, atau domain sendiri bila sudah dipasang).
- Setiap alamat web baru juga ditambahkan ke `FRONTEND_ORIGINS` di API.
- Paket Hobby Vercel hanya membatasi author commit untuk repo privat. Repo ini publik, jadi tidak perlu commit kosong atas nama pemilik seperti di lokerin. Bila repo dijadikan privat, deploy dari commit anggota lain akan diblokir.

## Kontribusi

Ikuti [AGENTS.md](AGENTS.md) dan [guideline tim](https://github.com/al-dioooo/akses-bogor-docs/tree/main/guidelines): issue, branch `feature/`, `fix/`, atau `chore/`, commit kecil dengan Conventional Commits, lalu PR dengan nomor issue di judul. CI menjalankan lint, typecheck, build, dan tes aksesibilitas di setiap PR.
