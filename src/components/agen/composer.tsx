"use client";

import { useTranslations } from "next-intl";
import { useEffect, useImperativeHandle, useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent, type Ref } from "react";
import { MAX_QUESTION } from "@/lib/agen-rute-isian";
import { Icon } from "@/ui/icon";
import { IconAlertTriangle, IconArrowUp, IconPlayerStop } from "@/ui/icons";

export type ComposerHandle = { focus: () => void };

/** Sisa karakter mulai ditampilkan di sini, dan dibacakan sekali saat melewati setiap batas. */
const SHOW_REMAINING = 100;
const THRESHOLDS = [100, 50, 20, 0];
const thresholdOf = (length: number) => THRESHOLDS.findLast((limit) => MAX_QUESTION - length <= limit);
/** Kotak tulis tumbuh sampai sekitar enam baris, lalu digulir. */
const MAX_HEIGHT = 200;

type Props = {
  ref?: Ref<ComposerHandle>;
  /** Agen AI sedang menjawab: tombol kirim menjadi tombol berhenti, dan Enter tidak mengirim. */
  answering: boolean;
  onSend: (question: string) => void;
  onStop: () => void;
  /** Id keterangan di bawah kotak tulis (catatan dan pintasan keyboard). */
  describedBy: string;
  /**
   * Fokus masuk atau keluar kotak tulis. Keluarnya dilaporkan sedikit terlambat, supaya Bottom nav yang muncul lagi
   * tidak menggeser tombol yang sedang disentuh.
   */
  onWriting?: (writing: boolean) => void;
};

const LEAVE_DELAY_MS = 300;

/**
 * Kotak tulis Agen AI (ADR-0054): tumbuh mengikuti isi, Enter mengirim dan Shift+Enter membuat baris baru (kecuali
 * saat menyusun huruf dengan IME), dan sisa karakter tampil saat mendekati 500. Selama agen menjawab, tombol yang sama
 * menjadi "Hentikan jawaban", jadi fokus tidak berpindah.
 */
export function Composer({ ref, answering, onSend, onStop, describedBy, onWriting }: Props) {
  const t = useTranslations("Agen.tulis");
  const [value, setValue] = useState("");
  const [problem, setProblem] = useState("");
  const [spoken, setSpoken] = useState("");
  const field = useRef<HTMLTextAreaElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const leaving = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(leaving.current), []);
  const remaining = MAX_QUESTION - value.length;

  // Kotak tulis selalu terlihat, jadi fokus tidak perlu menggulir; gulir ke pesan terbaru yang sedang berjalan tidak terputus.
  useImperativeHandle(ref, () => ({ focus: () => field.current?.focus({ preventScroll: true }) }), []);

  useLayoutEffect(() => {
    const element = field.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, MAX_HEIGHT)}px`;
  }, [value]);

  /** Pembaca layar mendengar sisa karakter hanya saat isian melewati 100, 50, 20, dan 0, bukan di setiap ketukan. */
  function change(next: string) {
    if (thresholdOf(next.length) !== thresholdOf(value.length)) {
      setSpoken(thresholdOf(next.length) === undefined ? "" : t("remaining", { count: Math.max(MAX_QUESTION - next.length, 0) }));
    }
    setValue(next);
    if (problem) setProblem("");
  }

  function submit(event?: FormEvent) {
    event?.preventDefault();
    if (answering) return;
    const question = value.trim();
    if (question.length < 2) {
      setProblem(t("tooShort"));
      return field.current?.focus();
    }
    setProblem("");
    setValue("");
    setSpoken("");
    onSend(question);
  }

  function keyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    submit();
  }

  function enter() {
    clearTimeout(leaving.current);
    onWriting?.(true);
  }

  function leave() {
    clearTimeout(leaving.current);
    leaving.current = setTimeout(() => {
      if (!form.current?.contains(document.activeElement)) onWriting?.(false);
    }, LEAVE_DELAY_MS);
  }

  const described = [describedBy, remaining <= SHOW_REMAINING ? "agen-sisa" : "", problem ? "agen-galat" : ""].filter(Boolean).join(" ");

  return (
    <form
      ref={form}
      onSubmit={submit}
      noValidate
      className="flex flex-col gap-2"
    >
      <div
        className={`agen-tulis panel-raised flex items-end gap-2 rounded-[1.75rem] py-1.5 pr-1.5 pl-4 has-[textarea:focus-visible]:outline-2 has-[textarea:focus-visible]:outline-offset-2 has-[textarea:focus-visible]:outline-focus-ring ${problem ? "border-border-error" : ""}`}
      >
        <label htmlFor="agen-isian" className="sr-only">
          {t("label")}
        </label>
        <textarea
          ref={field}
          id="agen-isian"
          rows={1}
          value={value}
          onChange={(event) => change(event.target.value)}
          onKeyDown={keyDown}
          onFocus={enter}
          onBlur={leave}
          maxLength={MAX_QUESTION}
          enterKeyHint="send"
          placeholder={t("placeholder")}
          aria-describedby={described}
          aria-invalid={problem ? true : undefined}
          className="min-h-11 flex-1 resize-none bg-transparent py-2.5 text-base leading-6 text-text-primary placeholder:text-text-secondary focus:outline-none"
        />
        <button
          type={answering ? "button" : "submit"}
          onClick={answering ? onStop : undefined}
          // Fokus tetap di kotak tulis, jadi keyboard ponsel tetap terbuka setelah mengirim atau berhenti.
          onMouseDown={(event) => event.preventDefault()}
          onFocus={enter}
          onBlur={leave}
          disabled={!answering && value.trim().length === 0}
          aria-label={answering ? t("stop") : t("send")}
          className={`grid size-11 shrink-0 place-items-center rounded-full transition-colors duration-200 disabled:cursor-not-allowed disabled:bg-surface-hover disabled:text-text-secondary ${
            answering ? "bg-text-primary text-bg-canvas hover:bg-text-secondary" : "bg-brand-fill text-text-on-brand hover:bg-brand-fill-hover"
          }`}
        >
          <Icon icon={answering ? IconPlayerStop : IconArrowUp} className={answering ? "size-4.5 fill-current" : "size-5"} />
        </button>
      </div>
      {(remaining <= SHOW_REMAINING || problem) && (
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 px-4 text-sm">
          {problem ? (
            <p id="agen-galat" role="alert" className="flex gap-1.5 font-semibold text-text-error">
              <Icon icon={IconAlertTriangle} className="mt-0.5 size-4" />
              {problem}
            </p>
          ) : (
            <span />
          )}
          {remaining <= SHOW_REMAINING && (
            <p id="agen-sisa" className={remaining <= 20 ? "font-semibold text-text-error" : "text-text-secondary"}>
              {t("remaining", { count: Math.max(remaining, 0) })}
            </p>
          )}
        </div>
      )}
      <p role="status" className="sr-only">
        {spoken}
      </p>
    </form>
  );
}
