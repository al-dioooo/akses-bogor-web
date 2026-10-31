// Membuat src/app/tokens.css dari ekspor variable Figma di design-tokens/figma-variables.json.
// Nama CSS diambil dari code syntax WEB di Figma, jadi `color/text/primary` menjadi
// `--color-text-primary` (ADR-0013). Berkas JSON juga dirapikan: satu variable per baris.
//
// Mode warna (ADR-0009): Glass bawaan, Solid untuk prefers-reduced-transparency, Dark untuk
// prefers-color-scheme: dark. Atribut data-theme="glass|solid|dark" di <html> mengalahkan
// preferensi sistem.
import { readFile, writeFile } from "node:fs/promises";

const SOURCE = "design-tokens/figma-variables.json";
const TARGET = "src/app/tokens.css";
// Grup yang punya namespace tema Tailwind, sehingga juga menjadi utility (bg-bg-canvas, rounded-lg, ...).
// Spasi sengaja tidak: Tailwind juga membaca --spacing-* untuk max-w-*, w-*, dan sejenisnya, sehingga
// --spacing-2xl (3rem) mengubah arti max-w-2xl. Spasi dipakai lewat variable, mis. p-(--spacing-md).
const THEME_GROUPS = new Set(["color", "radius", "blur"]);
// Grup yang ikut ukuran teks pengguna, jadi ditulis dalam rem.
const REM_GROUPS = new Set(["spacing", "size"]);

const data = JSON.parse(await readFile(SOURCE, "utf8"));
const variables = data.collections.flatMap((c) => c.variables);
const byName = new Map(variables.map((v) => [v.name, v]));
const collection = (name) => {
  const c = data.collections.find((x) => x.name === name);
  if (!c) throw new Error(`Koleksi ${name} tidak ada di ${SOURCE}`);
  return c;
};

const cssName = (v) => {
  const match = /^var\((--[a-z0-9-]+)\)$/.exec(v.css ?? "");
  if (!match) throw new Error(`Code syntax WEB untuk ${v.name} tidak valid: ${v.css}`);
  return match[1];
};
const group = (v) => v.name.split("/")[0];

function value(v, raw) {
  if (raw.alias) {
    const target = byName.get(raw.alias);
    if (!target) throw new Error(`${v.name} merujuk variable yang tidak ada: ${raw.alias}`);
    return `var(${cssName(target)})`;
  }
  if (raw.color) return raw.color.toLowerCase();
  if (typeof raw.value === "number") return REM_GROUPS.has(group(v)) ? `${raw.value / 16}rem` : `${raw.value}px`;
  throw new Error(`Nilai ${v.name} tidak dikenal: ${JSON.stringify(raw)}`);
}

const decl = (v, mode, indent = "  ") => `${indent}${cssName(v)}: ${value(v, v.values[mode])};`;
const differs = (v, mode, base) => JSON.stringify(v.values[mode]) !== JSON.stringify(v.values[base]);

const primitives = collection("Primitives");
const color = collection("Color");
const dimension = collection("Dimension");
const base = color.defaultMode;
const modeFor = (name) => {
  const mode = color.modes.find((m) => m.toLowerCase() === name);
  if (!mode) throw new Error(`Mode ${name} tidak ada di koleksi Color`);
  return mode;
};
const solid = modeFor("solid");
const dark = modeFor("dark");
const one = (c) => c.modes[0];
const changed = (mode) => color.variables.filter((v) => differs(v, mode, base)).map((v) => decl(v, mode, "    "));

const css = `/* Dibuat oleh scripts/tokens.mjs dari ${SOURCE}. Jangan diubah langsung: jalankan \`pnpm tokens\`. */

@theme static {
  /* Hanya token design system yang menjadi utility. */
  --color-*: initial;
  --radius-*: initial;
  --blur-*: initial;

  /* Color · ${base} (bawaan) */
${color.variables.map((v) => decl(v, base)).join("\n")}

  /* Dimension */
${dimension.variables.filter((v) => THEME_GROUPS.has(group(v))).map((v) => decl(v, one(dimension))).join("\n")}
}

:root {
  color-scheme: light;

  /* Primitives */
${primitives.variables.map((v) => decl(v, one(primitives))).join("\n")}

  /* Dimension */
${dimension.variables.filter((v) => !THEME_GROUPS.has(group(v))).map((v) => decl(v, one(dimension))).join("\n")}
}

/* ${solid}: permukaan opak untuk pengguna yang mengurangi transparansi. */
@media (prefers-reduced-transparency: reduce) {
  :root:not([data-theme]) {
${changed(solid).join("\n")}
  }
}

/* ${dark}: ditulis setelah ${solid}, jadi ${dark} menang bila kedua preferensi aktif. */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme]) {
    color-scheme: dark;
${changed(dark).join("\n")}
  }
}

:root[data-theme="${solid.toLowerCase()}"] {
${changed(solid).map((l) => l.slice(2)).join("\n")}
}

:root[data-theme="${dark.toLowerCase()}"] {
  color-scheme: dark;
${changed(dark).map((l) => l.slice(2)).join("\n")}
}
`;

// Satu variable per baris supaya diff ekspor berikutnya mudah dibaca.
const json = [
  "{",
  `  "source": ${JSON.stringify(data.source)},`,
  '  "collections": [',
  data.collections
    .map((c) =>
      [
        `    { "name": ${JSON.stringify(c.name)}, "modes": ${JSON.stringify(c.modes)}, "defaultMode": ${JSON.stringify(c.defaultMode)}, "variables": [`,
        c.variables.map((v) => `      ${JSON.stringify(v)}`).join(",\n"),
        "    ] }",
      ].join("\n"),
    )
    .join(",\n"),
  "  ]",
  "}",
  "",
].join("\n");

await writeFile(TARGET, css);
await writeFile(SOURCE, json);
console.log(`${TARGET}: ${variables.length} variable dari ${data.collections.length} koleksi`);
