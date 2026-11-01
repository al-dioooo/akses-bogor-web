# Ilustrasi

Poster hero Beranda dan close-up "Rute ke pintu" ([ADR-0028](https://github.com/al-dioooo/akses-bogor-docs/blob/main/decisions/0028-adegan-3d-three-js-untuk-hero-dan-rute.md)). Semuanya dirender dari adegan three.js di [`src/components/beranda/scene`](../../components/beranda/scene) oleh [`scripts/ilustrasi.mjs`](../../../scripts/ilustrasi.mjs), jadi gambarnya selalu sama dengan adegan yang hidup di halaman. Ini ilustrasi, bukan foto lokasi, dan tidak menggambarkan kondisi tempat mana pun.

| Berkas | Isi | Ukuran |
| --- | --- | --- |
| `halte-ke-pintu.webp` | Poster hero, sudut `hero`, detik ke-21,5: pejalan bertongkat putih di zebra cross, angkot ngetem, kursi roda menuju ramp | 1920 × 960 |
| `halte-ke-pintu-gelap.webp` | Poster yang sama versi malam, untuk mode Gelap | 1920 × 960 |
| `halte-ke-pintu.json` | Posisi pin 01–04 di poster (0..1 dari kiri dan atas), dibaca `hero-scene.tsx` saat adegan belum atau tidak dimuat | |
| `rute-01-guiding-block.webp` | Sudut `guiding_block`, detik ke-14 | 960 × 960 |
| `rute-02-ramp.webp` | Sudut `ramp`, detik ke-26 | 960 × 960 |
| `rute-03-toilet.webp` | Sudut `toilet_difabel`, detik ke-14 | 960 × 960 |
| `rute-04-lift.webp` | Sudut `lift`, detik ke-2, kabin di lantai dasar | 960 × 960 |

Sudut kamera dan waktu tiap gambar ada di `scene/index.ts` (`VIEWS`, `STOP_TIME`) dan di daftar `JOBS` skrip.

## Merender ulang

Bila adegan, sudut kamera, atau waktunya berubah, render ulang semua gambar lalu commit hasilnya bersama perubahan kodenya:

```bash
node scripts/ilustrasi.mjs
```

Skrip memakai Chromium milik `@playwright/test` (`pnpm exec playwright install chromium` bila belum ada) dan merender dengan SwiftShader, jadi tidak butuh GPU. `CHROMIUM_PATH=/jalur/ke/chrome` bila versi Chromium yang terpasang berbeda. Untuk memeriksa cepat: `node scripts/ilustrasi.mjs hero --png --scale 0.5 --out /tmp/cek`.
