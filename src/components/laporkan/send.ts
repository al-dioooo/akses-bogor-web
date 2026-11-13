// Mengirim draf Laporkan (ADR-0033): foto diunggah satu per satu dengan kemajuan, lalu laporan dikirim bersama id
// fotonya. Foto yang sudah terunggah tidak diunggah lagi saat mencoba ulang atau setelah masuk kembali.
import { toPayload, type ReportDraft } from "@/lib/isian-laporan";
import type { SubmittedReport, UploadedPhoto } from "@/lib/laporan";

type ApiAnswer<T> = { status: number; body: (T & { galat?: undefined; pesan?: undefined }) | { galat?: string; pesan?: string } };

export type SendOutcome =
  | { ok: true; report: SubmittedReport }
  /** Belum masuk atau sesi berakhir. */
  | { ok: false; reason: "masuk" }
  /** Akun belum melengkapi nama dan persetujuan Kebijakan Privasi. */
  | { ok: false; reason: "lengkapi" }
  /** Satu foto gagal diunggah; foto lain yang sudah terunggah tetap tercatat. */
  | { ok: false; reason: "foto"; key: string; message: string }
  /** API tidak lagi menyimpan foto yang pernah diunggah (lebih dari 24 jam). */
  | { ok: false; reason: "foto-hilang" }
  | { ok: false; reason: "lokasi"; message: string }
  | { ok: false; reason: "galat"; message: string | null };

export type SendHooks = {
  onUploadStart: (key: string, index: number) => void;
  onUploadProgress: (key: string, fraction: number) => void;
  onUploaded: (key: string, id: string) => void;
  onSubmitting: () => void;
};

/** Unggahan lewat XMLHttpRequest, karena `fetch` belum memberi kemajuan unggah di semua browser. */
function uploadPhoto(blob: Blob, onProgress: (fraction: number) => void): Promise<ApiAnswer<UploadedPhoto>> {
  return new Promise((resolve) => {
    const request = new XMLHttpRequest();
    request.open("POST", "/laporkan/foto");
    request.setRequestHeader("content-type", "image/jpeg");
    request.upload.onprogress = (event) => event.lengthComputable && onProgress(event.loaded / event.total);
    request.onload = () => {
      let body: ApiAnswer<UploadedPhoto>["body"] = {};
      try {
        body = JSON.parse(request.responseText) as ApiAnswer<UploadedPhoto>["body"];
      } catch {
        // Jawaban bukan JSON, mis. halaman galat proxy.
      }
      resolve({ status: request.status, body });
    };
    request.onerror = () => resolve({ status: 0, body: {} });
    request.send(blob);
  });
}

async function postReport(draft: ReportDraft): Promise<ApiAnswer<SubmittedReport>> {
  try {
    const response = await fetch("/laporkan/kirim", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(toPayload(draft)),
    });
    return { status: response.status, body: await response.json().catch(() => ({})) };
  } catch {
    return { status: 0, body: {} };
  }
}

const sessionProblem = (answer: ApiAnswer<unknown>): SendOutcome | null =>
  answer.status === 401 ? { ok: false, reason: "masuk" } : answer.status === 403 && answer.body.galat === "akun_belum_lengkap" ? { ok: false, reason: "lengkapi" } : null;

export async function sendDraft(draft: ReportDraft, hooks: SendHooks): Promise<SendOutcome> {
  const photos = draft.photos.map((photo) => ({ ...photo }));
  for (const [index, photo] of photos.entries()) {
    if (photo.uploadedId) continue;
    hooks.onUploadStart(photo.key, index);
    const answer = await uploadPhoto(photo.blob, (fraction) => hooks.onUploadProgress(photo.key, fraction));
    const problem = sessionProblem(answer);
    if (problem) return problem;
    if (answer.status !== 201 || !("id" in answer.body)) {
      return { ok: false, reason: "foto", key: photo.key, message: answer.body.pesan ?? "" };
    }
    photo.uploadedId = answer.body.id;
    hooks.onUploaded(photo.key, answer.body.id);
  }

  hooks.onSubmitting();
  const answer = await postReport({ ...draft, photos });
  const problem = sessionProblem(answer);
  if (problem) return problem;
  if (answer.status === 201 && "id" in answer.body) return { ok: true, report: answer.body as SubmittedReport };
  if (answer.body.galat === "foto_tidak_ditemukan") return { ok: false, reason: "foto-hilang" };
  if (answer.body.galat === "di_luar_kota_bogor") return { ok: false, reason: "lokasi", message: answer.body.pesan ?? "" };
  return { ok: false, reason: "galat", message: answer.status === 0 ? null : (answer.body.pesan ?? null) };
}
