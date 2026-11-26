// Asisten rute publik tiruan (/route-assistant/status, /route-assistant/ask) untuk tes Playwright, meniru
// akses-bogor-api (ADR-0050). Data hanya di memori.
//
// Aturan tiruan:
// - Asisten dibuka, kecuali untuk IP pengunjung 203.0.113.247: status menjawab enabled false dan pertanyaan 503
//   asisten_rute_belum_aktif.
// - Jawaban biasa menyebut lokasi yang dipilih (placeId) atau Halte contoh, dengan sumber dan satu kartu rute ke sana.
//   Pertanyaan yang memuat "kuota-tiruan" menjawab 429 kuota_habis, dan "sibuk-tiruan" menjawab 503 agen_sibuk.
//   Pertanyaan yang memuat "Masjid Al-Hidayah" menjawab dengan kartu rute ke kandidat OpenStreetMap node 9001.
// - GET /_tiruan/asisten-terakhir?ip=... menjawab badan pertanyaan terakhir dari IP itu, untuk memastikan titik awal
//   dan id lokasi ikut terkirim.
// - Agen AI (ADR-0054): akun lengkap yang mengirim contributorTools, selama agen kontributor dibuka (bukan IP
//   203.0.113.250), mendapat jawaban agen kontributor dengan kartu prioritas, tempat, dan rute untuk pertanyaan yang
//   memuat "didata". Penanya lain tetap mendapat jawaban asisten rute.

import { AGENT_OFF_IP, contributorAnswer } from "./agen-rute.mjs";
import { userFromToken } from "./akun.mjs";

export const ASSISTANT_OFF_IP = "203.0.113.247";
const HALTE = "4037ba19-b366-45bc-aceb-270944fe9372";
const STATUS_LABEL = { aksesibel: "Aksesibel", sebagian: "Sebagian", tidak_aksesibel: "Tidak aksesibel", belum_diketahui: "Belum diketahui" };
const lastQuestion = new Map();
const error = (status, galat, pesan) => [status, { galat, pesan }];

/** Menjawab route asisten rute publik, atau `null` bila bukan route asisten. */
export function handleTanyaRute(method, url, headers, body, places) {
  const { pathname, searchParams } = url;
  if (method === "GET" && pathname === "/_tiruan/asisten-terakhir") return [200, { body: lastQuestion.get(searchParams.get("ip")) ?? null }];
  if (!pathname.startsWith("/route-assistant/")) return null;
  const off = headers["x-visitor-ip"] === ASSISTANT_OFF_IP;
  if (method === "GET" && pathname === "/route-assistant/status") return [200, { enabled: !off, questionsPerDay: 5 }];
  if (method !== "POST" || pathname !== "/route-assistant/ask") return error(404, "tidak_ditemukan", "Alamat tidak ditemukan.");
  if (off) return error(503, "asisten_rute_belum_aktif", "Asisten rute belum dibuka.");
  lastQuestion.set(headers["x-visitor-ip"] ?? "", body);
  const question = String(body?.question ?? "");
  if (question.trim().length < 2) return error(400, "input_tidak_valid", "Data yang dikirim tidak sesuai. Periksa lagi isiannya.");
  if (question.includes("kuota-tiruan")) {
    return error(429, "kuota_habis", "Jatah 5 pertanyaan hari ini sudah habis. Coba lagi besok, atau masuk untuk memakai jatah akun Anda.");
  }
  if (question.includes("sibuk-tiruan")) return error(503, "agen_sibuk", "Asisten sedang sibuk. Coba lagi nanti.");
  const contributor = body?.contributorTools === true && userFromToken(headers.authorization)?.completed && headers["x-visitor-ip"] !== AGENT_OFF_IP;
  if (contributor && question.includes("didata")) return [200, contributorAnswer(places, question)];
  if (question.includes("Masjid Al-Hidayah")) {
    // Kandidat OpenStreetMap tiruan (node 9001 di agen-rute.mjs), tanpa data aksesibilitas dari tim (ADR-0049).
    return [
      200,
      {
        answer: "Masjid Al-Hidayah belum ada data aksesibilitas dari tim AksesBogor (© kontributor OpenStreetMap). Rute jalan kaki ada di kartu di bawah. Bila Anda pernah ke sana, Laporkan tempat ini.",
        sources: [{ type: "pengetahuan", citation: "© kontributor OpenStreetMap", title: "Kampus, masjid, halte, dan rumah sakit di Kota Bogor (OpenStreetMap)", url: "https://www.openstreetmap.org/copyright", license: "Open Database License (ODbL) 1.0", attribution: "© kontributor OpenStreetMap" }],
        model: "claude-haiku-5-5",
        cards: [{ type: "rute", target: { kind: "osm", osmType: "node", osmId: 9001 }, name: "Masjid Al-Hidayah" }],
      },
    ];
  }
  const place = places.find((p) => p.id === (body?.placeId ?? HALTE));
  if (!place) return error(404, "lokasi_tidak_ditemukan", "Lokasi tidak ditemukan.");
  return [
    200,
    {
      answer: `${place.name} berstatus ${STATUS_LABEL[place.status]} menurut data AksesBogor yang diperiksa tim.\nRute jalan kaki ada di kartu di bawah. Periksa peringatan dan hambatannya sebelum berangkat.`,
      sources: [{ type: "lokasi", placeId: place.id, name: place.name, lastVerifiedAt: place.lastVerifiedAt }],
      model: "claude-haiku-5-5",
      cards: [{ type: "rute", target: { kind: "aksesbogor", placeId: place.id }, name: place.name }],
    },
  ];
}
