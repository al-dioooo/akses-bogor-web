// Merender poster hero dan close-up "Rute ke pintu" dari adegan three.js (ADR-0028) dengan Chromium headless.
//
//   node scripts/ilustrasi.mjs            semua gambar ke src/assets/ilustrasi
//   node scripts/ilustrasi.mjs hero lift  hanya gambar yang disebut
//   --out <folder>   tujuan lain          --png   PNG, bukan WebP (untuk memeriksa)
//   --scale <n>      ukuran dikali n      --t <detik>   waktu cerita untuk semua gambar
//
// Chromium milik @playwright/test dipakai; CHROMIUM_PATH menunjuk Chromium lain bila versinya berbeda.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import ts from "typescript";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args.splice(i, 2)[1];
};
const png = args.includes("--png");
if (png) args.splice(args.indexOf("--png"), 1);
const out = resolve(flag("out", join(root, "src/assets/ilustrasi")));
const scale = +flag("scale", "1");
const forcedT = flag("t", null);

const JOBS = {
  hero: { file: "halte-ke-pintu", view: "hero", w: 1920, h: 960, t: 21.5, night: false, pins: true },
  "hero-gelap": { file: "halte-ke-pintu-gelap", view: "hero", w: 1920, h: 960, t: 21.5, night: true },
  guiding_block: { file: "rute-01-guiding-block", view: "guiding_block", w: 960, h: 960, t: 14 },
  ramp: { file: "rute-02-ramp", view: "ramp", w: 960, h: 960, t: 26 },
  toilet_difabel: { file: "rute-03-toilet", view: "toilet_difabel", w: 960, h: 960, t: 14 },
  lift: { file: "rute-04-lift", view: "lift", w: 960, h: 960, t: 2 },
};
const names = args.length ? args : Object.keys(JOBS);

const TYPES = { ".js": "text/javascript", ".mjs": "text/javascript", ".ts": "text/javascript", ".html": "text/html" };
// Berkas TypeScript adegan ditranspilasi per permintaan; three.js dilayani dari node_modules lewat import map.
function serve(pathname) {
  let file = join(root, pathname);
  if (!extname(file)) file += ".ts";
  const ext = extname(file);
  let body = readFileSync(file);
  if (ext === ".ts") body = ts.transpileModule(body.toString(), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  return { status: 200, contentType: TYPES[ext] ?? "application/octet-stream", body };
}

const PAGE = `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:#fff}</style>
<script type="importmap">{"imports":{"three":"/node_modules/three/build/three.module.js","three/addons/":"/node_modules/three/examples/jsm/"}}</script>
<script type="module">
import { NeutralToneMapping, PCFShadowMap, PerspectiveCamera, WebGLRenderer } from "three";
import { buildScene, VIEWS } from "/src/components/beranda/scene/index.ts";
window.render = async ({ view, w, h, t, night, type }) => {
  const renderer = new WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(w, h);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;
  renderer.toneMapping = NeutralToneMapping;
  const background = night ? "#12131A" : "#F9F9F7";
  renderer.setClearColor(background);
  document.body.appendChild(renderer.domElement);
  const built = buildScene({ shadowSize: 4096 });
  built.setNight(night, background);
  const camera = new PerspectiveCamera();
  built.frame(camera, VIEWS[view], w / h);
  built.update(t, t);
  renderer.render(built.scene, camera);
  const image = await new Promise((done) => renderer.domElement.toBlob((blob) => {
    const reader = new FileReader();
    reader.onload = () => done(reader.result.split(",")[1]);
    reader.readAsDataURL(blob);
  }, type, 0.8));
  const pins = built.pins.map((p) => {
    const v = p.clone().project(camera);
    return [+((v.x + 1) / 2).toFixed(4), +((1 - v.y) / 2).toFixed(4)];
  });
  const info = { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles };
  renderer.dispose();
  built.dispose();
  renderer.domElement.remove();
  return { image, pins, info };
};
window.ready = true;
</script>`;

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH,
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
const page = await browser.newPage({ viewport: { width: 64, height: 64 } });
page.on("pageerror", (e) => console.error(e.message));
await page.route("http://ilustrasi.local/**", (route) => {
  const { pathname } = new URL(route.request().url());
  if (pathname === "/") return route.fulfill({ status: 200, contentType: "text/html", body: PAGE });
  try {
    return route.fulfill(serve(pathname));
  } catch {
    return route.fulfill({ status: 404, body: "" });
  }
});
await page.goto("http://ilustrasi.local/");
await page.waitForFunction(() => window.ready === true);

for (const name of names) {
  const job = JOBS[name];
  if (!job) throw new Error(`Tidak ada gambar bernama ${name}; pilihannya ${Object.keys(JOBS).join(", ")}`);
  const w = Math.round(job.w * scale);
  const h = Math.round(job.h * scale);
  const t = forcedT == null ? job.t : +forcedT;
  const started = Date.now();
  const { image, pins, info } = await page.evaluate((o) => window.render(o), { ...job, w, h, t, type: png ? "image/png" : "image/webp" });
  const file = join(out, `${job.file}.${png ? "png" : "webp"}`);
  const bytes = Buffer.from(image, "base64");
  writeFileSync(file, bytes);
  if (job.pins && !png) writeFileSync(join(out, `${job.file}.json`), JSON.stringify({ width: w, height: h, pins }) + "\n");
  console.log(`${file} ${w}×${h} ${(bytes.length / 1024).toFixed(0)} KB, ${info.calls} draw call, ${info.triangles} segitiga, ${Date.now() - started} ms`);
}
await browser.close();
