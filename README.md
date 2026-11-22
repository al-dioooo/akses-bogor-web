# AksesBogor Web

Aplikasi web AksesBogor: informasi aksesibilitas fasilitas publik di Kota Bogor. Pengguna mencari tempat, melihat status pintu masuk dan fasilitasnya, lalu melaporkan tempat baru atau kekurangan. Dibuat mobile-first dan bisa dipasang sebagai PWA ([ADR-0012](https://github.com/al-dioooo/akses-bogor-docs/blob/main/decisions/0012-web-mobile-first-pwa.md)).

Keputusan produk dan teknis ada di [akses-bogor-docs](https://github.com/al-dioooo/akses-bogor-docs), termasuk [PRD](https://github.com/al-dioooo/akses-bogor-docs/blob/main/product/prd.md), [ADR](https://github.com/al-dioooo/akses-bogor-docs/tree/main/decisions), dan [referensi Figma](https://github.com/al-dioooo/akses-bogor-docs/blob/main/product/referensi-figma.md). Data diambil dari [akses-bogor-api](https://github.com/al-dioooo/akses-bogor-api).

## Tech Stack

| Bagian | Pilihan |
| --- | --- |
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Gaya | Tailwind CSS v4; token design system Figma sebagai CSS variables dan utility |
| Bahasa | next-intl, satu locale `id` |
| Tes dan lint | Vitest + Testing Library untuk komponen, Playwright + axe-core untuk halaman, ESLint dengan `jsx-a11y` strict |
| Hosting | Evergarden (OCI Batam): systemd + `next start`, dibuka lewat Cloudflare Tunnel |

Alasan pilihan ini ada di [ADR-0013](https://github.com/al-dioooo/akses-bogor-docs/blob/main/decisions/0013-tech-stack-nextjs-fastify.md), dan untuk hosting di [ADR-0048](https://github.com/al-dioooo/akses-bogor-docs/blob/main/decisions/0048-web-di-host-sendiri-di-evergarden-oci.md).

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
| `pnpm test` | Tes Vitest untuk komponen klien dan fungsi kecil (`src/**/*.test.ts(x)`) di jsdom |
| `pnpm test:a11y` | Build, lalu tes Playwright + axe-core di ponsel dan desktop, dengan data dari API tiruan di `e2e/mock-api` |

## Environment Variables

Contoh ada di [.env.example](.env.example); salin ke `.env.local`. Jangan commit `.env*`.

| Variabel | Wajib | Keterangan |
| --- | --- | --- |
| `API_URL` | Ya | Alamat [akses-bogor-api](https://github.com/al-dioooo/akses-bogor-api), mis. `http://localhost:8080`. Hanya dibaca di server; browser tidak pernah memanggil API langsung |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Tidak | Client ID OAuth Google AksesBogor, sama dengan `GOOGLE_CLIENT_ID` di API. Bukan rahasia; dibaca saat build. Kosong berarti tombol "Masuk dengan Google" tidak tampil |
| `WEB_SERVER_SECRET` | Di server | Rahasia bersama dengan API, nilainya sama dengan `WEB_SERVER_SECRET` di API. Bila diisi, setiap panggilan API membawa IP pengunjung sehingga rate limit dihitung per pengunjung, bukan per IP server web |
| `SITE_URL` | Di server | Alamat situs tanpa path, mis. `https://akses-bogor.aldio.dev`. Dipakai untuk URL kanonis, OpenGraph, sitemap, dan `robots.txt`, dan sebagai asal tepercaya untuk POST yang memakai sesi (kirim laporan, unggah foto, Bantu memetakan). Kosong berarti `http://localhost:3000`, dan server produksi menolak POST itu dengan 403; skrip deploy menolak build tanpa nilai ini |
| `SITE_INDEXABLE` | Tidak | `true` supaya halaman publik boleh diindeks mesin pencari. Hanya berlaku bila `SITE_URL` juga diisi. Bawaannya mati: semua halaman `noindex` dan `robots.txt` melarang semua crawler |

`SITE_URL` dan `SITE_INDEXABLE` dibaca saat build untuk halaman statis. Di server, mengubah `web.env` otomatis berarti build baru (lihat [Deployment](#deployment)). Selama domain produksi belum dipilih ([ADR-0045](https://github.com/al-dioooo/akses-bogor-docs/blob/main/decisions/0045-alamat-staging-di-aldio-dev.md)), staging memakai `SITE_URL=https://akses-bogor.aldio.dev` tanpa `SITE_INDEXABLE`. Saat domain produksi siap, ganti `SITE_URL` ke domain itu, isi `SITE_INDEXABLE=true`, lalu deploy ulang. Hanya halaman publik (Beranda, Jelajahi, Peta, Detail lokasi, halaman edukasi, Tentang, dan halaman hukum) yang bisa diindeks; halaman akun, masuk, Laporkan, dan verifikasi selalu `noindex`.

Peta tidak butuh variabel Mapbox di web. Browser mengambil token Mapbox sementara dari `/peta/kunci`, yang meneruskannya dari `GET /map/token` di API ([ADR-0016](https://github.com/al-dioooo/akses-bogor-docs/blob/main/decisions/0016-peta-dan-pencarian-mapbox.md)). Selama API belum diatur, halaman Peta menampilkan legenda dan daftar lokasi tanpa peta.

## Token Design System

Warna, spasi, radius, dan ukuran berasal dari variable design system ([ADR-0027](https://github.com/al-dioooo/akses-bogor-docs/blob/main/decisions/0027-design-system-datar-dan-ilustrasi-3d.md)). Nama CSS-nya sama dengan code syntax di Figma: `color/text/primary` menjadi `--color-text-primary`. Snapshot versi 2 diubah langsung di repo ini; variable di [Figma](https://www.figma.com/design/aTaMQUxVF2P1zQlJY3s4du/AksesBogor?node-id=1-2) masih versi 1 dan diperbarui menyusul.

| Berkas | Isi |
| --- | --- |
| [design-tokens/figma-variables.json](design-tokens/figma-variables.json) | Snapshot variable, satu variable per baris |
| [src/app/tokens.css](src/app/tokens.css) | CSS hasil `pnpm tokens`; jangan diubah langsung |
| [scripts/tokens.mjs](scripts/tokens.mjs) | Generator CSS |
| [scripts/figma/export-variables.js](scripts/figma/export-variables.js) | Skrip ekspor yang dijalankan di file Figma |
| [scripts/ilustrasi.mjs](scripts/ilustrasi.mjs) | Merender poster hero dan close-up dari adegan three.js ([catatan](src/assets/ilustrasi/README.md)) |
| [scripts/ikon.mjs](scripts/ikon.mjs) | Membuat favicon (`src/app/icon.svg`, `favicon.ico`), Apple touch icon, dan ikon manifest di `public/ikon/` dari tanda di [src/ui/logo-mark.json](src/ui/logo-mark.json). Jalankan lagi setelah bentuk tanda atau warna token berubah |

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

Web berjalan di Evergarden, VM Ubuntu 24.04 di OCI region Batam, di server yang sama dengan API, dan dibuka di `https://akses-bogor.aldio.dev` lewat Cloudflare Tunnel ([ADR-0048](https://github.com/al-dioooo/akses-bogor-docs/blob/main/decisions/0048-web-di-host-sendiri-di-evergarden-oci.md)). API ada di `https://akses-bogor-api.aldio.dev` ([ADR-0026](https://github.com/al-dioooo/akses-bogor-docs/blob/main/decisions/0026-api-dan-postgresql-di-evergarden-oci.md)). Untuk sementara lingkungan ini disebut staging, dan domain produksinya belum diputuskan ([ADR-0045](https://github.com/al-dioooo/akses-bogor-docs/blob/main/decisions/0045-alamat-staging-di-aldio-dev.md)). Berkasnya ada di [deploy/](deploy/).

| Bagian | Di Evergarden |
| --- | --- |
| Web | `akses-bogor-web.service`: user `aksesbogor-web`, `next start` di `127.0.0.1:8091`, Node 24, memori maksimal 1 GB |
| Environment | `/etc/akses-bogor/web.env`, contohnya [deploy/web.env.example](deploy/web.env.example). Dibaca saat build dan saat runtime |
| Rilis | `/srv/akses-bogor-web/releases/<sha>-<hash web.env>`; rilis aktif ditunjuk tautan `/srv/akses-bogor-web/current`, rilis sebelumnya oleh `previous` |
| Deploy | `akses-bogor-web-deploy.timer` memeriksa branch `release` setiap 5 menit dan menjalankan [deploy/deploy.sh](deploy/deploy.sh) |
| Tunnel | Public hostname di dashboard Cloudflare Zero Trust, diarahkan ke `http://127.0.0.1:8091` |

### Rilis

Merge `main` ke `release` lewat PR, sama seperti API. Paling lama lima menit kemudian, timer mengekspor commit itu ke folder rilis baru, menjalankan `pnpm install --frozen-lockfile` dan `pnpm build` dengan isi `web.env`, memindahkan `current`, me-restart web, lalu memeriksa `/` dan `/robots.txt`. Build butuh sekitar 20 detik dan memori sekitar 2 GB. Tiga rilis terakhir disimpan.

```bash
journalctl -u akses-bogor-web-deploy -n 50    # hasil deploy terakhir
journalctl -u akses-bogor-web -n 50           # log Next.js
sudo systemctl start akses-bogor-web-deploy   # deploy sekarang tanpa menunggu timer
curl -sI https://akses-bogor.aldio.dev
```

`NEXT_PUBLIC_*`, `SITE_URL`, dan `SITE_INDEXABLE` ditanam saat build. Karena itu nama folder rilis memuat hash `web.env`: setelah `web.env` diubah, timer berikutnya membangun rilis baru dari commit yang sama, termasuk untuk perubahan yang hanya dibaca saat runtime seperti `WEB_SERVER_SECRET`.

Bila health check gagal setelah restart, skrip mengembalikan `current` ke rilis sebelumnya, me-restart web, dan menandai rilis itu di `/srv/akses-bogor-web/gagal/`. Unit deploy berstatus gagal, dan timer tidak mencobanya lagi sampai `release` berisi commit baru atau `web.env` berubah. Build yang gagal tidak memindahkan `current` dan dicoba lagi pada jadwal berikutnya, seperti di API.

Rollback dengan tangan dilakukan dengan revert di `release`. Bila perlu kembali sebelum revert itu masuk:

```bash
sudo systemctl stop akses-bogor-web-deploy.timer
sudo -u aksesbogor-web ln -sfn releases/<rilis-lama> /srv/akses-bogor-web/current
sudo systemctl restart akses-bogor-web
```

Nyalakan lagi timer setelah revert masuk ke `release`. Unit systemd dan skrip di `deploy/` dipasang dengan tangan, jadi perubahan pada berkas itu baru berlaku setelah dipasang ulang dengan perintah `install` di bawah dan `sudo systemctl daemon-reload`.

Tidak ada preview deployment per PR. Screenshot di PR diambil dari Playwright di lokal.

### Menyiapkan Server

Sekali saja, sebagai admin, dari checkout repo ini:

```bash
# User sistem tanpa akses database
sudo useradd --system --home-dir /srv/akses-bogor-web --shell /usr/sbin/nologin aksesbogor-web
sudo install -d -m 0750 -o aksesbogor-web -g aksesbogor-web /srv/akses-bogor-web

# Skrip, unit, dan environment. Folder /etc/akses-bogor milik grup aksesbogor (API), jadi user web hanya diberi hak
# masuk ke folder itu, tanpa bisa membaca api.env.
sudo install -d -m 0755 /usr/local/lib/akses-bogor-web
sudo install -m 0755 deploy/deploy.sh /usr/local/lib/akses-bogor-web/
sudo install -m 0644 deploy/akses-bogor-web.service deploy/akses-bogor-web-deploy.service \
  deploy/akses-bogor-web-deploy.timer /etc/systemd/system/
sudo setfacl -m u:aksesbogor-web:x /etc/akses-bogor
sudo install -m 0640 -o root -g aksesbogor-web deploy/web.env.example /etc/akses-bogor/web.env   # lalu sesuaikan
sudo systemctl daemon-reload

# Rilis pertama, lalu nyalakan semuanya
sudo -u aksesbogor-web -H git clone --bare https://github.com/al-dioooo/akses-bogor-web.git /srv/akses-bogor-web/repo.git
sudo systemctl start akses-bogor-web-deploy
sudo systemctl enable akses-bogor-web akses-bogor-web-deploy.timer
sudo systemctl start akses-bogor-web-deploy.timer
```

Terakhir, arahkan public hostname `akses-bogor.aldio.dev` di tunnel Evergarden (Zero Trust → Networks → Tunnels) ke `http://127.0.0.1:8091`. Hostname lain di tunnel itu jangan diubah. Setiap alamat web baru juga ditambahkan ke `FRONTEND_ORIGINS` di API.

## Kontribusi

Ikuti [AGENTS.md](AGENTS.md) dan [guideline tim](https://github.com/al-dioooo/akses-bogor-docs/tree/main/guidelines): issue, branch `feature/`, `fix/`, atau `chore/`, commit kecil dengan Conventional Commits, lalu PR dengan nomor issue di judul. CI menjalankan lint, typecheck, build, dan tes aksesibilitas di setiap PR.
