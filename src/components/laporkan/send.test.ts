import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { newDraft, type ReportDraft } from "@/lib/isian-laporan";
import { sendDraft, type SendHooks } from "./send";

/** XMLHttpRequest tiruan: setiap unggahan menjawab dari antrean `uploads`. */
let uploads: { status: number; body: unknown }[];
let uploaded: Blob[];
class FakeXhr {
  status = 0;
  responseText = "";
  upload: { onprogress?: (event: { lengthComputable: boolean; loaded: number; total: number }) => void } = {};
  onload?: () => void;
  onerror?: () => void;
  open() {}
  setRequestHeader() {}
  send(blob: Blob) {
    uploaded.push(blob);
    const next = uploads.shift()!;
    this.upload.onprogress?.({ lengthComputable: true, loaded: 1, total: 2 });
    this.status = next.status;
    this.responseText = JSON.stringify(next.body);
    queueMicrotask(() => this.onload?.());
  }
}

let report: { status: number; body: unknown };
const posted: unknown[] = [];

beforeEach(() => {
  uploads = [];
  uploaded = [];
  posted.length = 0;
  report = { status: 201, body: { id: "r1", kind: "baru", status: "menunggu" } };
  vi.stubGlobal("XMLHttpRequest", FakeXhr);
  vi.stubGlobal("fetch", async (_url: string, init: RequestInit) => {
    posted.push(JSON.parse(String(init.body)));
    return Response.json(report.body, { status: report.status });
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const hooks = (): SendHooks & { log: string[] } => {
  const log: string[] = [];
  return {
    log,
    onUploadStart: (key) => log.push(`mulai ${key}`),
    onUploadProgress: (key, fraction) => log.push(`${key} ${fraction}`),
    onUploaded: (key, id) => log.push(`${key} → ${id}`),
    onSubmitting: () => log.push("kirim"),
  };
};

const draft = (uploadedFirst = false): ReportDraft => ({
  ...newDraft("baru", null),
  name: "Halte contoh",
  category: "halte",
  location: { point: { lat: -6.59, lng: 106.79 }, district: { slug: "bogor-tengah", name: "Bogor Tengah" } },
  photos: [
    { key: "a", blob: new Blob(["a"]), name: "a.jpg", width: 1, height: 1, tag: "pintu_masuk", caption: "", uploadedId: uploadedFirst ? "id-a" : null },
    { key: "b", blob: new Blob(["b"]), name: "b.jpg", width: 1, height: 1, tag: "lift", caption: "", uploadedId: null },
  ],
});

describe("sendDraft", () => {
  it("uploads only photos without an id, then sends the report with every id", async () => {
    uploads.push({ status: 201, body: { id: "id-b" } });
    const h = hooks();
    expect(await sendDraft(draft(true), h)).toEqual({ ok: true, report: { id: "r1", kind: "baru", status: "menunggu" } });
    expect(uploaded).toHaveLength(1);
    expect(h.log).toEqual(["mulai b", "b 0.5", "b → id-b", "kirim"]);
    expect((posted[0] as { photos: unknown[] }).photos).toEqual([
      { id: "id-a", tag: "pintu_masuk", caption: undefined },
      { id: "id-b", tag: "lift", caption: undefined },
    ]);
  });

  it("stops at a failed photo and keeps the ones already uploaded", async () => {
    uploads.push({ status: 201, body: { id: "id-a" } }, { status: 502, body: { galat: "foto_gagal_disimpan", pesan: "Foto gagal disimpan." } });
    const h = hooks();
    expect(await sendDraft(draft(), h)).toEqual({ ok: false, reason: "foto", key: "b", message: "Foto gagal disimpan." });
    expect(h.log).toContain("a → id-a");
    expect(posted).toEqual([]);
  });

  it("asks to sign in again when the session is gone, and to complete the account", async () => {
    uploads.push({ status: 401, body: { galat: "belum_masuk" } });
    expect(await sendDraft(draft(), hooks())).toEqual({ ok: false, reason: "masuk" });
    report = { status: 403, body: { galat: "akun_belum_lengkap", pesan: "Lengkapi akun dulu." } };
    expect(await sendDraft({ ...draft(), photos: [] }, hooks())).toEqual({ ok: false, reason: "lengkapi" });
  });

  it("tells photos that expired on the server, a point outside Kota Bogor, and other errors apart", async () => {
    const noPhotos = { ...draft(), photos: [] };
    report = { status: 400, body: { galat: "foto_tidak_ditemukan", pesan: "Unggah ulang." } };
    expect(await sendDraft(noPhotos, hooks())).toEqual({ ok: false, reason: "foto-hilang" });
    report = { status: 422, body: { galat: "di_luar_kota_bogor", pesan: "Di luar Kota Bogor." } };
    expect(await sendDraft(noPhotos, hooks())).toEqual({ ok: false, reason: "lokasi", message: "Di luar Kota Bogor." });
    report = { status: 429, body: { galat: "laporan_terlalu_sering", pesan: "Coba lagi besok." } };
    expect(await sendDraft(noPhotos, hooks())).toEqual({ ok: false, reason: "galat", message: "Coba lagi besok." });
  });
});
