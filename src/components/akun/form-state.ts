// Hasil Server Action di halaman akun, dibaca lewat useActionState.
export type FormState = {
  /** Galat untuk satu kolom (fokus pindah ke kolom itu), atau untuk seluruh formulir bila `field` kosong. */
  error?: { field?: string; message: string };
  /** Pesan berhasil yang dibacakan pembaca layar, mis. "Kode baru sudah dikirim". */
  notice?: string;
  /** Isian yang dikirim, supaya tidak hilang saat galat. */
  values?: Record<string, string>;
  /** Detik sampai kode baru boleh diminta. */
  resendAfter?: number;
};

export const EMPTY_FORM: FormState = {};
