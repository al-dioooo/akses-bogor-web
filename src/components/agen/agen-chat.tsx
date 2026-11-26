"use client";

import { useTranslations } from "next-intl";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { AgenAnswer } from "@/lib/agen";
import { historyOf, loadConversation, messageId, saveConversation, type AgentMessage, type Message } from "@/lib/percakapan";
import { buttonClass } from "@/ui/button-styles";
import { Icon } from "@/ui/icon";
import { IconArrowDown, IconMessagePlus } from "@/ui/icons";
import { AgenBar } from "./agen-bar";
import { Composer, type ComposerHandle } from "./composer";
import { EmptyState } from "./empty-state";
import { AgentReply, ProblemRow, Thinking, UserBubble, type Problem } from "./messages";

/** Galat yang bukan kesalahan pengguna: agen sibuk atau terlalu sering dipakai. */
const BUSY = new Set(["agen_sibuk", "agen_terlalu_sering", "asisten_rute_belum_aktif"]);

/** Gerak halus kecuali pengguna mematikan gerak di Tampilan atau di perangkatnya. */
const motion = (): ScrollBehavior =>
  document.documentElement.dataset.motion === "off" || window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";

type Props = {
  /** Jatah pertanyaan per pengunjung per hari dari API. */
  questionsPerDay: number;
  /** Akun yang sudah lengkap selama agen kontributor dibuka. */
  contributor: boolean;
  signedIn: boolean;
  /** Tempat dari "Tanya rute ke sini" (`?tempat=`), dikirim bersama setiap pertanyaan. */
  place?: { id: string; name: string };
};

type Pending = { id: string; content: string; problem?: Problem };

/**
 * Obrolan Agen AI (ADR-0054). Percakapan hanya ada di tab ini (`sessionStorage`, lihat lib/percakapan.ts), dan setiap
 * pertanyaan mengirim paling banyak enam giliran sebelumnya ke route handler `/agen/tanya`. Pertanyaan tampil langsung
 * di kanan, lalu indikator mengetik sampai jawaban utuh tiba (API belum mengalirkan jawaban). Live region halaman hanya
 * membacakan jawaban terbaru, dan fokus tetap di kotak tulis.
 */
export function AgenChat({ questionsPerDay, contributor, signedIn, place }: Props) {
  const t = useTranslations("Agen");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);
  const [answering, setAnswering] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [awayFromEnd, setAwayFromEnd] = useState(false);
  const [writing, setWriting] = useState(false);
  const composer = useRef<ComposerHandle>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const request = useRef<AbortController | null>(null);
  /** Pertanyaan yang jawabannya baru tiba: digulir ke atas layar supaya jawabannya terbaca dari awal. */
  const reveal = useRef<string | null>(null);
  /** Percakapan tersimpan baru dipulihkan: digulir ke pesan terbaru setelah tampil. */
  const restored = useRef(false);

  function measure() {
    const element = scroller.current;
    if (element) setAwayFromEnd(element.scrollHeight - element.scrollTop - element.clientHeight > 120);
  }

  function scrollToEnd(behavior: ScrollBehavior = motion()) {
    const element = scroller.current;
    element?.scrollTo({ top: element.scrollHeight, behavior });
  }

  // Percakapan tersimpan dibaca setelah hydration, supaya HTML server dan klien sama.
  useEffect(() => {
    const saved = loadConversation();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sessionStorage hanya ada di browser.
    setMessages(saved);
    setLoaded(true);
    restored.current = saved.length > 0;
  }, []);

  // Disimpan sebelum digambar, jadi jawaban yang sudah terlihat tetap ada bila halaman langsung dimuat ulang.
  useLayoutEffect(() => {
    if (loaded) saveConversation(messages);
  }, [messages, loaded]);

  // Kartu rute yang selesai dimuat memanjangkan percakapan; tombol "Ke pesan terbaru" ikut diperbarui.
  useEffect(() => {
    const content = scroller.current?.firstElementChild;
    if (!content) return;
    const observer = new ResizeObserver(() => measure());
    observer.observe(content);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    if (restored.current) {
      restored.current = false;
      scrollToEnd("auto");
    }
    if (reveal.current) {
      scroller.current?.querySelector(`[data-pesan="${reveal.current}"]`)?.scrollIntoView({ block: "start", behavior: motion() });
      reveal.current = null;
    }
  }, [messages]);

  useLayoutEffect(() => {
    if (pending && !pending.problem) scrollToEnd();
  }, [pending]);

  async function ask(question: string, id = messageId()) {
    const controller = new AbortController();
    request.current = controller;
    setPending({ id, content: question });
    setAnswering(true);
    setAnnouncement(t("percakapan.thinking"));
    try {
      const response = await fetch("/agen/tanya", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question, history: historyOf(messages), ...(place ? { placeId: place.id } : {}) }),
        signal: controller.signal,
      });
      const body = (await response.json().catch(() => ({}))) as Partial<AgenAnswer> & { galat?: string; pesan?: string };
      if (request.current !== controller) return;
      if (!response.ok || typeof body.answer !== "string") {
        const code = body.galat ?? "";
        setPending({ id, content: question, problem: { kind: "galat", text: body.pesan ?? t("percakapan.failed"), busy: BUSY.has(code), quota: code === "kuota_habis" } });
        setAnnouncement("");
        return;
      }
      const reply: AgentMessage = { id: messageId(), role: "agent", content: body.answer, sources: body.sources ?? [], cards: body.cards ?? [] };
      reveal.current = id;
      setMessages((current) => [...current, { id, role: "user", content: question }, reply]);
      setPending(null);
      setAnnouncement(t("percakapan.answered", { answer: body.answer }));
    } catch {
      // Percakapan baru menggantikan permintaan ini; hasilnya tidak dipakai lagi.
      if (request.current !== controller) return;
      const stopped = controller.signal.aborted;
      setPending({ id, content: question, problem: stopped ? { kind: "dihentikan" } : { kind: "galat", text: t("percakapan.failed"), busy: false, quota: false } });
      setAnnouncement(stopped ? t("percakapan.stopped") : "");
    } finally {
      if (request.current === controller) {
        request.current = null;
        setAnswering(false);
      }
    }
  }

  function send(question: string) {
    void ask(question);
    // Saran pertanyaan hilang setelah dipilih, jadi fokus pindah ke kotak tulis.
    composer.current?.focus();
  }

  /** Membatalkan permintaan web. API bisa tetap menyelesaikannya, jadi jatahnya tetap terpakai. */
  function stop() {
    request.current?.abort();
    composer.current?.focus();
  }

  function retry() {
    if (!pending || answering) return;
    void ask(pending.content, pending.id);
    composer.current?.focus();
  }

  function reset() {
    const current = request.current;
    request.current = null;
    current?.abort();
    setAnswering(false);
    setPending(null);
    setMessages([]);
    setAnnouncement(t("baruDone"));
    composer.current?.focus();
  }

  const empty = messages.length === 0 && !pending;

  return (
    <>
      <AgenBar
        title={t("title")}
        action={
          !empty && (
            <button type="button" onClick={reset} className={buttonClass("ghost", "sm", "-mr-2")}>
              <Icon icon={IconMessagePlus} />
              {t("baru")}
            </button>
          )
        }
      />
      <div ref={scroller} onScroll={measure} className="agen-gulir">
        <div className="agen-kolom flex min-h-full flex-col py-4 sm:py-6">
          {empty ? (
            <EmptyState contributor={contributor} place={place} onPick={send} />
          ) : (
            <ol aria-label={t("percakapan.label")} className="flex flex-col gap-7">
              {messages.map((message) =>
                message.role === "user" ? (
                  <UserBubble key={message.id} id={message.id} content={message.content} />
                ) : (
                  <AgentReply key={message.id} message={message} onAnnounce={setAnnouncement} />
                ),
              )}
              {pending && <UserBubble id={pending.id} content={pending.content} />}
              {pending && (pending.problem ? <ProblemRow problem={pending.problem} signedIn={signedIn} onRetry={retry} /> : <Thinking />)}
            </ol>
          )}
        </div>
      </div>
      {/* Selama menulis, Bottom nav disembunyikan (globals.css) supaya keyboard ponsel tidak menutup kotak tulis. */}
      <div className="agen-bawah" data-menulis={writing || undefined}>
        <div className="agen-kolom relative flex flex-col gap-2">
          {awayFromEnd && !empty && (
            <button
              type="button"
              onClick={() => {
                scrollToEnd();
                composer.current?.focus();
              }}
              className="panel-raised absolute -top-15 left-1/2 grid size-11 -translate-x-1/2 place-items-center rounded-full hover:bg-surface-hover"
            >
              <Icon icon={IconArrowDown} />
              <span className="sr-only">{t("percakapan.latest")}</span>
            </button>
          )}
          <Composer ref={composer} answering={answering} onSend={send} onStop={stop} describedBy="agen-catatan" onWriting={setWriting} />
          <p id="agen-catatan" className="px-4 text-center text-xs text-text-secondary">
            {t("tulis.note", { count: questionsPerDay })}
            <span className="max-lg:hidden"> {t("tulis.keys")}</span>
          </p>
        </div>
      </div>
      <p role="status" className="sr-only">
        {announcement}
      </p>
    </>
  );
}
