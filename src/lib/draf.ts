import type { ReportDraft } from "./isian-laporan";

// Draf Laporkan di IndexedDB browser (ADR-0033): isian dan foto yang sudah diperkecil, supaya tidak hilang saat pelapor
// ke Masuk dan kembali, menekan Kembali atau Maju, memuat ulang halaman, atau sesinya berakhir. Draf tidak dikirim ke
// server dan dihapus setelah terkirim, saat Keluar atau Hapus akun, atau 7 hari setelah terakhir diubah.

const DATABASE = "aksesbogor-laporkan";
const STORE = "draf";
export const DRAFT_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

export const isExpired = (draft: Pick<ReportDraft, "updatedAt">, now = Date.now()) => now - draft.updatedAt > DRAFT_DAYS * DAY_MS;

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: "draftKey" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function run<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = db.transaction(STORE, mode);
      const request = action(transaction.objectStore(STORE));
      transaction.oncomplete = () => resolve(request.result);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    db.close();
  }
}

/** Draf untuk kunci itu, atau null bila tidak ada atau sudah lebih dari 7 hari (lalu dihapus). */
export async function loadDraft(draftKey: string, now = Date.now()): Promise<ReportDraft | null> {
  const draft = (await run("readonly", (store) => store.get(draftKey))) as ReportDraft | undefined;
  if (!draft) return null;
  if (isExpired(draft, now)) {
    await deleteDraft(draftKey);
    return null;
  }
  return draft;
}

export async function saveDraft(draft: ReportDraft) {
  await run("readwrite", (store) => store.put(draft));
}

export async function deleteDraft(draftKey: string) {
  await run("readwrite", (store) => store.delete(draftKey));
}

/** Menghapus draf yang lebih dari 7 hari. Dipanggil saat Laporkan dibuka. */
export async function purgeExpiredDrafts(now = Date.now()) {
  const drafts = (await run("readonly", (store) => store.getAll())) as ReportDraft[];
  for (const draft of drafts) if (isExpired(draft, now)) await deleteDraft(draft.draftKey);
}

/** Menghapus semua draf di perangkat ini, saat Keluar dan Hapus akun. Tidak gagal bila IndexedDB tidak tersedia. */
export function clearAllDrafts(): Promise<void> {
  return new Promise((resolve) => {
    try {
      const request = indexedDB.deleteDatabase(DATABASE);
      request.onsuccess = request.onerror = request.onblocked = () => resolve();
    } catch {
      resolve();
    }
  });
}
