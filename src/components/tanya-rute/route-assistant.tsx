"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useRef, useState, type FormEvent } from "react";
import { Sources } from "@/components/bantu-memetakan/contributor-chat";
import { RouteCard, type RouteEndpoints } from "@/components/rute-jalan-kaki/route-card";
import { StartPoint, type StartPointCopy } from "@/components/rute-jalan-kaki/start-point";
import type { AgentSource } from "@/lib/agen-rute";
import { historyFor, MAX_QUESTION } from "@/lib/agen-rute-isian";
import type { LatLng } from "@/lib/laporan";
import type { AssistantAnswer, AssistantCard } from "@/lib/tanya-rute";
import { buttonClass } from "@/ui/button-styles";
import { fieldClass } from "@/ui/field-styles";
import { Icon } from "@/ui/icon";
import { IconAlertTriangle, IconFocusCentered, IconInfoCircle, IconMapPin, IconSend, IconShieldCheck, IconX } from "@/ui/icons";

type Turn = { role: "user" | "assistant"; content: string; sources?: AgentSource[]; cards?: AssistantCard[]; from?: LatLng };
type Start = { point: LatLng; source: "perangkat" | "peta" };

export const ASSISTANT_ENDPOINTS: RouteEndpoints = { route: "/tanya-rute/rute", obstacles: "/tanya-rute/hambatan" };
/** Galat yang bukan kesalahan isian: kolom tidak ditandai salah, dan pertanyaannya tetap ada. */
const BUSY = new Set(["agen_sibuk", "kuota_habis", "agen_terlalu_sering", "asisten_rute_belum_aktif"]);
const EXAMPLES = ["hospital", "mosque", "halte"] as const;
const linkClass = "font-semibold text-text-brand underline underline-offset-2";
/** Contoh pertanyaan boleh turun baris, supaya kalimat panjang tidak melebarkan panel di layar 320 px. */
const EXAMPLE_BUTTON = buttonClass("outline", "sm", "py-2 text-left").replace("whitespace-nowrap ", "");

type Props = {
  /** Lokasi dari "Tanya rute ke sini" (`?tempat=`), dikirim bersama pertanyaan sampai pengunjung menghapusnya. */
  place?: { id: string; name: string };
  /** Jatah pertanyaan per pengunjung per hari dari API. */
  questionsPerDay: number;
};

/**
 * Asisten rute publik (ADR-0050) untuk siapa pun, juga tanpa akun. Percakapan hanya ada di state halaman ini. Titik
 * awal dipilih sekali di halaman (penjelasan dulu, lalu lokasi perangkat atau titik di peta), dikirim ke server
 * AksesBogor bersama pertanyaan untuk tempat terdekat, dan dipakai kartu rute; server tidak meneruskannya ke model.
 */
export function RouteAssistant({ place: initialPlace, questionsPerDay }: Props) {
  const t = useTranslations("TanyaRute");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [question, setQuestion] = useState("");
  const [sending, setSending] = useState(false);
  const [problem, setProblem] = useState<{ text: string; busy: boolean } | null>(null);
  const [start, setStart] = useState<Start | null>(null);
  const [choosing, setChoosing] = useState(true);
  const [place, setPlace] = useState(initialPlace);
  const field = useRef<HTMLTextAreaElement>(null);
  const startSummary = useRef<HTMLParagraphElement>(null);
  const lastAnswer = turns.findLast((turn) => turn.role === "assistant")?.content;
  const startCopy: StartPointCopy = { title: t("awal.title"), why: t("awal.why"), privacy: t("awal.privacy") };

  function chooseStart(point: LatLng, source: Start["source"]) {
    setStart({ point, source });
    setChoosing(false);
    // Fokus pindah ke ringkasan titik awal supaya pengguna keyboard dan pembaca layar tahu titiknya sudah dipakai.
    requestAnimationFrame(() => startSummary.current?.focus());
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const text = question.trim();
    if (text.length < 2) {
      setProblem({ text: t("tanya.tooShort"), busy: false });
      return field.current?.focus();
    }
    setSending(true);
    setProblem(null);
    const from = start?.point;
    try {
      const response = await fetch("/tanya-rute/tanya", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          question: text,
          history: historyFor(turns.map(({ role, content }) => ({ role, content }))),
          ...(place ? { placeId: place.id } : {}),
          ...(from ? { from } : {}),
        }),
      });
      const body = (await response.json().catch(() => ({}))) as Partial<AssistantAnswer> & { galat?: string; pesan?: string };
      if (!response.ok || typeof body.answer !== "string") {
        setProblem({ text: body.pesan ?? t("tanya.failed"), busy: BUSY.has(body.galat ?? "") });
        return;
      }
      setTurns((current) => [
        ...current,
        { role: "user", content: text },
        { role: "assistant", content: body.answer!, sources: body.sources ?? [], cards: body.cards ?? [], from },
      ]);
      setQuestion("");
    } catch {
      setProblem({ text: t("tanya.failed"), busy: false });
    } finally {
      setSending(false);
    }
  }

  const examples = [...(place ? [t("tanya.example.place", { name: place.name })] : []), ...EXAMPLES.map((key) => t(`tanya.example.${key}`))];

  return (
    <div className="flex w-full max-w-3xl flex-col gap-6">
      <p className="flex gap-3 rounded-3xl bg-bg-sunken p-5">
        <Icon icon={IconShieldCheck} className="mt-0.5 size-6 shrink-0 text-icon-brand" />
        <span>
          {t.rich("notice", {
            link: (chunks) => (
              <Link href="/kebijakan-privasi" className={linkClass}>
                {chunks}
              </Link>
            ),
          })}
        </span>
      </p>

      <section aria-labelledby="awal-judul" className="panel flex flex-col gap-4 rounded-3xl p-5 sm:p-6">
        <h2 id="awal-judul" className="font-heading text-2xl font-bold">
          {t("awal.heading")}
        </h2>
        {start && !choosing ? (
          <div className="flex flex-col items-start gap-3">
            <p ref={startSummary} tabIndex={-1} className="flex gap-2 font-semibold">
              <Icon icon={start.source === "perangkat" ? IconFocusCentered : IconMapPin} className="mt-0.5 size-5 shrink-0 text-icon-brand" />
              {t(`awal.chosen.${start.source}`)}
            </p>
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={() => setChoosing(true)} className={buttonClass("outline", "md")}>
                {t("awal.change")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setStart(null);
                  setChoosing(true);
                }}
                className={buttonClass("ghost", "md")}
              >
                {t("awal.clear")}
              </button>
            </div>
          </div>
        ) : (
          <>
            <StartPoint onStart={chooseStart} copy={startCopy} level={3} />
            {start && (
              <button type="button" onClick={() => setChoosing(false)} className={buttonClass("ghost", "md", "self-start")}>
                {t("awal.keep")}
              </button>
            )}
          </>
        )}
      </section>

      <section aria-labelledby="tanya-judul" className="panel flex flex-col gap-4 rounded-3xl p-5 sm:p-6">
        <h2 id="tanya-judul" className="font-heading text-2xl font-bold">
          {t("tanya.title")}
        </h2>

        {place && (
          <p className="flex flex-wrap items-center gap-3 rounded-2xl bg-surface-brand-subtle p-3">
            <Icon icon={IconMapPin} className="size-5 shrink-0 text-icon-brand" />
            <span className="font-semibold">{t("place.label", { name: place.name })}</span>
            <button
              type="button"
              onClick={() => {
                setPlace(undefined);
                field.current?.focus();
              }}
              className={buttonClass("ghost", "sm")}
            >
              <Icon icon={IconX} />
              {t("place.clear")}
            </button>
          </p>
        )}

        {turns.length > 0 && (
          <ol aria-label={t("tanya.conversation")} className="flex flex-col gap-3">
            {turns.map((turn, index) => (
              <li key={index} className={`flex flex-col gap-2 rounded-2xl p-4 ${turn.role === "user" ? "ml-6 bg-surface-brand-subtle" : "mr-6 bg-bg-sunken"}`}>
                <span className="text-sm font-bold">{turn.role === "user" ? t("tanya.you") : t("tanya.assistant")}</span>
                <p className="whitespace-pre-line">{turn.content}</p>
                {turn.sources && <Sources sources={turn.sources} />}
                {turn.cards && turn.cards.length > 0 && (
                  <ul aria-label={t("cards")} className="flex w-full flex-col gap-3">
                    {turn.cards.map((card, cardIndex) => (
                      <li key={cardIndex}>
                        <RouteCard target={card.target} name={card.name} endpoints={ASSISTANT_ENDPOINTS} from={turn.from} startCopy={startCopy} />
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ol>
        )}
        {turns.length > 0 && (
          <p className="flex gap-2 text-sm text-text-secondary">
            <Icon icon={IconInfoCircle} className="mt-0.5 size-4 shrink-0" />
            {t("tanya.note")}
          </p>
        )}
        <p role="status" className="sr-only">
          {sending ? t("tanya.sending") : lastAnswer ? t("tanya.answered", { answer: lastAnswer }) : ""}
        </p>

        <form onSubmit={submit} className="flex flex-col gap-3" noValidate>
          <label htmlFor="tanya-rute-isian" className="font-semibold">
            {t("tanya.label")}
          </label>
          <p id="tanya-rute-petunjuk" className="text-sm text-text-secondary">
            {t("tanya.hint", { count: questionsPerDay })}
          </p>
          <textarea
            ref={field}
            id="tanya-rute-isian"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            maxLength={MAX_QUESTION}
            rows={3}
            aria-describedby={["tanya-rute-petunjuk", problem ? "tanya-rute-galat" : ""].filter(Boolean).join(" ")}
            aria-invalid={problem && !problem.busy ? true : undefined}
            className={fieldClass(Boolean(problem && !problem.busy), "min-h-24 py-3")}
          />
          {problem && (
            <p id="tanya-rute-galat" role="alert" className={`flex gap-2 rounded-2xl p-3 font-semibold ${problem.busy ? "bg-status-partial-bg text-text-primary" : "text-text-error"}`}>
              <Icon icon={IconAlertTriangle} className="mt-0.5 size-5 shrink-0" />
              {problem.text}
            </p>
          )}
          <button type="submit" disabled={sending} className={buttonClass("primary", "md", "self-start disabled:opacity-70")}>
            <Icon icon={IconSend} />
            {sending ? t("tanya.sending") : t("tanya.send")}
          </button>
        </form>

        <div role="group" aria-labelledby="tanya-rute-contoh" className="flex flex-col gap-2">
          <p id="tanya-rute-contoh" className="text-sm font-semibold">
            {t("tanya.examples")}
          </p>
          <div className="flex flex-wrap gap-2">
            {examples.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => {
                  setQuestion(example);
                  field.current?.focus();
                }}
                className={EXAMPLE_BUTTON}
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
