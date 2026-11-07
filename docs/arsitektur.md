# Arsitektur

Sumber keputusan: [ADR-0013](https://github.com/al-dioooo/akses-bogor-docs/blob/main/decisions/0013-tech-stack-nextjs-fastify.md), [ADR-0025](https://github.com/al-dioooo/akses-bogor-docs/blob/main/decisions/0025-api-dan-postgresql-di-vps-sendiri.md), [ADR-0026](https://github.com/al-dioooo/akses-bogor-docs/blob/main/decisions/0026-api-dan-postgresql-di-evergarden-oci.md), dan [ADR-0029](https://github.com/al-dioooo/akses-bogor-docs/blob/main/decisions/0029-akun-better-auth-dan-sesi-lewat-server-web.md). Bagian yang direncanakan tetapi belum ada ditandai garis putus-putus.

```mermaid
flowchart LR
  B[Browser / PWA] -->|halaman + cookie sesi| W[akses-bogor-web<br/>Next.js di Vercel]
  W -->|render di server, Bearer sesi| F[akses-bogor-api<br/>Fastify di Evergarden, lewat Cloudflare Tunnel]
  B -->|tile peta| M[Mapbox]
  F -->|token peta sementara| M
  F --> DB[(PostgreSQL 17 + PostGIS di Evergarden)]
```

- Web tidak pernah terhubung langsung ke database atau Cloudflare R2. Semua data lewat [akses-bogor-api](https://github.com/al-dioooo/akses-bogor-api).
- Halaman mengambil data dari API di server Next.js saat request (`src/lib/api.ts`, alamatnya di `API_URL`). Pengambilan data tidak di-cache dan tidak berjalan saat build, jadi build tidak butuh API. Bagian yang menunggu data dibungkus `Suspense` dengan kerangka pemuatan, dan galat API tampil sebagai pesan dengan tombol coba lagi.
- Sesi akun disimpan server web di cookie `HttpOnly`, `Secure`, `SameSite=Lax` miliknya sendiri (`__Host-aksesbogor-sesi`), lalu dikirim ke API sebagai `Authorization: Bearer` (`src/lib/sesi.ts`, `src/lib/akun.ts`). Browser tidak pernah memegang token dalam bentuk yang bisa dibaca JavaScript, dan tidak ada cookie lintas situs.
- Peta dirender Mapbox GL JS di browser ([ADR-0016](https://github.com/al-dioooo/akses-bogor-docs/blob/main/decisions/0016-peta-dan-pencarian-mapbox.md)), dengan tampilan daftar sebagai alternatif yang setara. Mapbox GL JS dimuat hanya di halaman Peta dan hanya bila WebGL ada. Token Mapbox sementara dibuat API dan diteruskan ke browser lewat route `/peta/kunci`; token rahasia tidak pernah keluar dari API.

## Bahasa

Teks antarmuka ada di `messages/id.json` dan dibaca lewat next-intl ([ADR-0020](https://github.com/al-dioooo/akses-bogor-docs/blob/main/decisions/0020-antarmuka-bahasa-indonesia-siap-i18n.md)). Locale `id` dan zona waktu `Asia/Jakarta` diatur di `src/i18n/config.ts`. Tidak ada routing per bahasa di MVP; menambah bahasa berarti menambah berkas pesan dan pemilih bahasa.

## Tampilan dan Gerak

- Mode warna mengikuti perangkat (Terang atau Gelap). Pengaturan tampilan di header bisa memaksa salah satunya lewat `<html data-theme>`, dan "Kurangi gerakan" memasang `<html data-motion="off">`. Pilihan disimpan di `localStorage` (`aksesbogor-tampilan`) dan dipasang oleh skrip kecil di `<head>` sebelum halaman digambar.
- Hero Beranda dan "Rute ke pintu" memakai adegan 3D "Halte ke pintu" yang dibangun dari kode dengan three.js (`src/components/beranda/scene`, [ADR-0028](https://github.com/al-dioooo/akses-bogor-docs/blob/main/decisions/0028-adegan-3d-three-js-untuk-hero-dan-rute.md)). Poster yang dirender dari adegan yang sama tampil dulu; three.js dimuat malas lewat `import()` hanya bila gerak tidak dikurangi dan WebGL ada, lalu kanvas menggantikan poster pada bingkai yang sama. Adegan bergerak hanya bila hero terlihat dan tab aktif, dan punya tombol hentikan. Di "Rute ke pintu" layar lebar, kamera berpindah ke fasilitas yang sedang dibaca; di ponsel tampil close-up diam. Mode Gelap menampilkan versi malam.
- Gerak memakai satu kurva (`ease-out-expo`): kartu terangkat 2 px saat disorot, dan konten muncul saat digulir lewat scroll timeline CSS. Semuanya berhenti bila perangkat meminta gerak dikurangi atau `data-motion="off"`, dan konten tidak pernah disembunyikan bila browser tidak mendukung animasinya.
- Ikon berasal dari Tabler Icons (MIT) dan disalin sebagai path di `src/ui/icons.ts`, tanpa dependensi tambahan.

## Pengujian Aksesibilitas

Sesuai [ADR-0021](https://github.com/al-dioooo/akses-bogor-docs/blob/main/decisions/0021-wcag-22-aa-dan-pengujian-berlapis.md):

| Lapisan | Di repo ini |
| --- | --- |
| Lint | Aturan `jsx-a11y` strict di `eslint.config.mjs` |
| Tes komponen | `src/**/*.test.ts(x)`: Vitest + Testing Library di jsdom untuk komponen klien dan fungsi kecil (`pnpm test`) |
| Tes otomatis | `e2e/a11y.spec.ts`: axe-core untuk WCAG 2.2 AA di ponsel dan desktop; pelanggaran serious atau critical menggagalkan CI |
| Tes perilaku | `e2e/*.spec.ts`: pencarian, filter, keadaan kosong dan galat, dan isi Detail, dengan data dari API tiruan |
| Setiap PR | Checklist aksesibilitas di template PR |
| Setiap rilis | Uji manual dengan TalkBack, NVDA, dan VoiceOver; di luar repo |

## Struktur Folder

| Folder | Isi |
| --- | --- |
| `src/app` | Route App Router, layout, `globals.css`, dan `tokens.css` hasil generator |
| `src/lib` | Klien API, sesi akun, dan pembaca filter Jelajahi dari URL |
| `src/ui` | Komponen dasar: ikon, gaya tombol, Status badge, judul bagian, keadaan galat |
| `src/components` | Bagian halaman: header, Bottom nav, footer, pengaturan tampilan, dan isi tiap halaman |
| `src/assets` | Poster dan close-up hasil render adegan, dengan catatan cara merender ulang |
| `design-tokens` | Snapshot ekspor variable Figma |
| `scripts` | Generator token, skrip ekspor Figma, dan perender ilustrasi |
| `src/i18n` | Konfigurasi next-intl |
| `messages` | Teks antarmuka per bahasa |
| `e2e` | Tes Playwright; `e2e/mock-api` berisi API tiruan dan datanya |
| `public` | Aset statis |
| `docs` | Dokumen ini |
