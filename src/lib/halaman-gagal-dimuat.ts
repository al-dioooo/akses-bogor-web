import messages from "../../messages/id.json";
import { tokenColor } from "@/components/berbagi/token";

const ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const escapeHtml = (text: string) => text.replace(/[&<>"']/g, (char) => ESCAPES[char]);

/**
 * Halaman 503 Detail lokasi saat API galat atau tidak bisa dihubungi (issue #150), dikirim langsung oleh src/proxy.ts.
 * Halaman aplikasi tidak bisa dipakai di sini karena kerangka halamannya selalu berstatus 200 (Cache Components), jadi
 * halaman ini berdiri sendiri: HTML dan gaya sebaris, teks dari messages/id.json, dan warna token mode Terang.
 * `retryPath` adalah alamat lokasi yang dibuka, untuk tombol "Coba lagi".
 */
export function failedPlacePage(retryPath: string): string {
  const t = messages.GagalMemuat;
  const c = {
    canvas: tokenColor("color/bg/canvas"),
    text: tokenColor("color/text/primary"),
    secondary: tokenColor("color/text/secondary"),
    brand: tokenColor("color/brand/fill"),
    onBrand: tokenColor("color/text/on-brand"),
    border: tokenColor("color/border/strong"),
    focus: tokenColor("color/focus/ring"),
  };
  return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${escapeHtml(t.title)} · ${escapeHtml(messages.Metadata.title)}</title>
<style>
body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;box-sizing:border-box;background:${c.canvas};color:${c.text};font-family:system-ui,sans-serif;line-height:1.5}
main{max-width:40rem;display:flex;flex-direction:column;align-items:flex-start;gap:24px}
h1{margin:0;font-size:clamp(2.25rem,1.4rem + 2.8vw,4rem);line-height:1}
p{margin:0;font-size:1.125rem;color:${c.secondary}}
.aksi{display:flex;flex-wrap:wrap;gap:12px}
a{display:inline-flex;align-items:center;min-height:48px;padding:0 24px;box-sizing:border-box;border-radius:999px;font-weight:700;text-decoration:none}
a.utama{background:${c.brand};color:${c.onBrand}}
a.garis{border:2px solid ${c.border};color:${c.text}}
a:focus-visible{outline:3px solid ${c.focus};outline-offset:2px}
</style>
</head>
<body>
<main id="konten">
<h1>${escapeHtml(t.title)}</h1>
<p>${escapeHtml(t.body)}</p>
<div class="aksi">
<a class="utama" href="${escapeHtml(retryPath)}">${escapeHtml(t.retry)}</a>
<a class="garis" href="/jelajahi">${escapeHtml(messages.Detail.back)}</a>
</div>
</main>
</body>
</html>
`;
}
