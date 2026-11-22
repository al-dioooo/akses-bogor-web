// Membuat favicon dan ikon aplikasi dari tanda di src/ui/logo-mark.json (issue #127). Jalankan `node scripts/ikon.mjs`
// setelah bentuk tanda atau warna token berubah, lalu commit hasilnya.
//
// Hasil:
//   src/app/icon.svg                  favicon SVG, sudut kecil dan tanda sedikit lebih besar untuk ukuran tab
//   src/app/favicon.ico               16, 32, dan 48 px dari SVG favicon, untuk browser lama
//   src/app/apple-icon.png            180 px, kotak penuh (iOS membulatkan sudutnya sendiri)
//   public/ikon/ikon-192.png          manifest, kotak bersudut bulat
//   public/ikon/ikon-512.png          manifest, kotak bersudut bulat
//   public/ikon/ikon-maskable-512.png manifest maskable: kotak penuh, tanda di dalam lingkaran ruang aman 80%
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
// sharp ikut terpasang bersama Next.js, jadi tidak perlu dependensi baru.
const sharp = require(require.resolve("sharp", { paths: [require.resolve("next/package.json")] }));

const root = new URL("..", import.meta.url);
const read = async (path) => JSON.parse(await readFile(new URL(path, root), "utf8"));
const mark = await read("src/ui/logo-mark.json");
const tokens = await read("design-tokens/figma-variables.json");

const variables = new Map(tokens.collections.flatMap((collection) => collection.variables.map((v) => [v.name, v])));
/** Warna token mode Terang sebagai hex, alias diikuti sampai primitive. */
function color(name) {
  const value = variables.get(name)?.values.Terang ?? variables.get(name)?.values.Value;
  if (value?.color) return value.color;
  if (value?.alias) return color(value.alias);
  throw new Error(`Token warna tidak ada: ${name}`);
}

const C = {
  background: color("color/brand/fill"),
  pin: color("color/text/on-brand"),
  door: color("color/brand/fill"),
  leaf: color("color/text/highlight"),
};

/**
 * SVG tanda. `rounded`: kotak bersudut bulat. `favicon`: sudut lebih kecil dan tanda sedikit diperbesar supaya pintu
 * tetap terlihat di 16 px. `maskable`: kotak penuh, tanda diperkecil ke dalam ruang aman.
 */
function svg({ rounded = false, favicon = false, maskable = false } = {}) {
  const size = mark.viewBox;
  const radius = favicon ? mark.favicon.cornerRadius : rounded ? mark.cornerRadius : 0;
  const corner = radius ? ` rx="${radius}"` : "";
  const scale = favicon ? mark.favicon.transform : maskable ? mark.maskableTransform : "";
  const transform = scale ? ` transform="${scale}"` : "";
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">`,
    `<rect width="${size}" height="${size}"${corner} fill="${C.background}"/>`,
    `<g${transform}>`,
    `<path d="${mark.pin}" fill="${C.pin}"/>`,
    `<path d="${mark.door}" fill="${C.door}"/>`,
    `<path d="${mark.leaf}" fill="${C.leaf}"/>`,
    "</g>",
    "</svg>",
    "",
  ].join("\n");
}

function png(source, size) {
  return sharp(Buffer.from(source), { density: (72 * size) / mark.viewBox })
    .resize(size, size)
    .png({ compressionLevel: 9, palette: true })
    .toBuffer();
}

/** Berkas ICO dengan gambar PNG di dalamnya (didukung sejak Windows Vista dan semua browser modern). */
function ico(images) {
  const header = Buffer.alloc(6 + images.length * 16);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach(({ size, data }, index) => {
    const entry = 6 + index * 16;
    header.writeUInt8(size >= 256 ? 0 : size, entry);
    header.writeUInt8(size >= 256 ? 0 : size, entry + 1);
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(data.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += data.length;
  });
  return Buffer.concat([header, ...images.map(({ data }) => data)]);
}

const out = (path) => new URL(path, root);
await mkdir(out("public/ikon/"), { recursive: true });

const rounded = svg({ rounded: true });
const favicon = svg({ favicon: true });
await writeFile(out("src/app/icon.svg"), favicon);
await writeFile(out("src/app/favicon.ico"), ico(await Promise.all([16, 32, 48].map(async (size) => ({ size, data: await png(favicon, size) })))));
await writeFile(out("src/app/apple-icon.png"), await png(svg(), 180));
await writeFile(out("public/ikon/ikon-192.png"), await png(rounded, 192));
await writeFile(out("public/ikon/ikon-512.png"), await png(rounded, 512));
await writeFile(out("public/ikon/ikon-maskable-512.png"), await png(svg({ maskable: true }), 512));
console.log("Ikon dibuat dari src/ui/logo-mark.json.");
