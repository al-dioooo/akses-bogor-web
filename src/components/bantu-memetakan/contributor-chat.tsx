"use client";

import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { useRef, useState, type FormEvent } from "react";
import type { AgentAnswer, AgentCard, AgentSource } from "@/lib/agen-rute";
import { historyFor, MAX_QUESTION } from "@/lib/agen-rute-isian";
import { buttonClass } from "@/ui/button-styles";
import { fieldClass } from "@/ui/field-styles";
import { Icon } from "@/ui/icon";
import { IconAlertTriangle, IconExternalLink, IconInfoCircle, IconSend } from "@/ui/icons";
import { AgentCards } from "./agent-cards";

type Turn = { role: "user" | "assistant"; content: string; sources?: AgentSource[]; cards?: AgentCard[] };
const EXAMPLES = ["priority", "mosque", "near"] as const;
const linkClass = "font-semibold text-text-brand underline underline-offset-2";
/** Contoh pertanyaan boleh turun baris, supaya kalimat panjang tidak melebarkan panel di layar 320 px. */
const EXAMPLE_BUTTON = buttonClass("outline", "sm", "py-2 text-left").replace("whitespace-nowrap ", "");

function Sources({ sources }: { sources: AgentSource[] }) {
  const t = useTranslations("BantuMemetakan.tanya");
  const format = useFormatter();
  if (sources.length === 0) return null;
  return (
    <div className="flex flex-col gap-1 border-t border-border-subtle pt-2 text-sm">
      <p className="font-semibold">{t("sources")}</p>
      <ul className="flex flex-col gap-1">
        {sources.map((source) =>
          source.type === "lokasi" ? (
            <li key={`lokasi-${source.placeId}`}>
              <Link href={`/lokasi/${source.placeId}`} className={linkClass}>
                {t("sourcePlace", { name: source.name, date: format.dateTime(new Date(source.lastVerifiedAt), { dateStyle: "long" }) })}
              </Link>
            </li>
          ) : (
            <li key={`pengetahuan-${source.citation}`}>
              <a href={source.url} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-1 ${linkClass}`}>
                {source.citation}
                <Icon icon={IconExternalLink} className="size-4 shrink-0" />
              </a>
              <span className="block text-text-secondary">{[t("license", { license: source.license }), source.attribution].filter(Boolean).join(" · ")}</span>
            </li>
          ),
        )}
      </ul>
    </div>
  );
}

/**
 * Obrolan agen bantu memetakan (ADR-0043). Percakapan hanya disimpan di state halaman ini; setiap pertanyaan mengirim
 * paling banyak enam giliran sebelumnya ke route handler web, tanpa posisi atau rute pengguna.
 */
export function ContributorChat() {
  const t = useTranslations("BantuMemetakan.tanya");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [question, setQuestion] = useState("");
  const [sending, setSending] = useState(false);
  const [problem, setProblem] = useState<{ text: string; busy: boolean } | null>(null);
  const field = useRef<HTMLTextAreaElement>(null);
  const lastAnswer = turns.findLast((turn) => turn.role === "assistant")?.content;

  async function submit(event: FormEvent) {
    event.preventDefault();
    const text = question.trim();
    if (text.length < 2) {
      setProblem({ text: t("tooShort"), busy: false });
      return field.current?.focus();
    }
    setSending(true);
    setProblem(null);
    try {
      const response = await fetch("/laporkan/bantu-memetakan/tanya", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: text, history: historyFor(turns.map(({ role, content }) => ({ role, content }))) }),
      });
      const body = (await response.json().catch(() => ({}))) as Partial<AgentAnswer> & { galat?: string; pesan?: string };
      if (!response.ok || typeof body.answer !== "string") {
        setProblem({ text: body.pesan ?? t("failed"), busy: body.galat === "agen_sibuk" || body.galat === "agen_terlalu_sering" });
        return;
      }
      setTurns((current) => [...current, { role: "user", content: text }, { role: "assistant", content: body.answer!, sources: body.sources ?? [], cards: body.cards ?? [] }]);
      setQuestion("");
    } catch {
      setProblem({ text: t("failed"), busy: false });
    } finally {
      setSending(false);
    }
  }

  return (
    <section aria-labelledby="tanya-judul" className="panel flex flex-col gap-4 rounded-3xl p-5 sm:p-6">
      <h2 id="tanya-judul" className="font-heading text-2xl font-bold">
        {t("title")}
      </h2>
      <p className="text-text-secondary">{t("intro")}</p>

      {turns.length > 0 && (
        <ol aria-label={t("conversation")} className="flex flex-col gap-3">
          {turns.map((turn, index) => (
            <li key={index} className={`flex flex-col gap-2 rounded-2xl p-4 ${turn.role === "user" ? "ml-6 bg-surface-brand-subtle" : "mr-6 bg-bg-sunken"}`}>
              <span className="text-sm font-bold">{turn.role === "user" ? t("you") : t("agent")}</span>
              <p className="whitespace-pre-line">{turn.content}</p>
              {turn.sources && <Sources sources={turn.sources} />}
              {turn.cards && <AgentCards cards={turn.cards} />}
            </li>
          ))}
        </ol>
      )}
      {turns.length > 0 && (
        <p className="flex gap-2 text-sm text-text-secondary">
          <Icon icon={IconInfoCircle} className="mt-0.5 size-4 shrink-0" />
          {t("note")}
        </p>
      )}
      <p role="status" className="sr-only">
        {sending ? t("sending") : lastAnswer ? t("answered", { answer: lastAnswer }) : ""}
      </p>

      <form onSubmit={submit} className="flex flex-col gap-3" noValidate>
        <label htmlFor="tanya-isian" className="font-semibold">
          {t("label")}
        </label>
        <p id="tanya-petunjuk" className="text-sm text-text-secondary">
          {t("hint")}
        </p>
        <p id="tanya-privasi" className="flex gap-2 rounded-2xl bg-bg-sunken p-3 text-sm">
          <Icon icon={IconAlertTriangle} className="mt-0.5 size-4 shrink-0 text-status-partial-fg" />
          {t("privacy")}
        </p>
        <textarea
          ref={field}
          id="tanya-isian"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          maxLength={MAX_QUESTION}
          rows={3}
          aria-describedby={["tanya-petunjuk", "tanya-privasi", problem ? "tanya-galat" : ""].filter(Boolean).join(" ")}
          aria-invalid={problem && !problem.busy ? true : undefined}
          className={fieldClass(Boolean(problem && !problem.busy), "min-h-24 py-3")}
        />
        {problem && (
          <p id="tanya-galat" role="alert" className={`flex gap-2 rounded-2xl p-3 font-semibold ${problem.busy ? "bg-status-partial-bg text-text-primary" : "text-text-error"}`}>
            <Icon icon={IconAlertTriangle} className="mt-0.5 size-5 shrink-0" />
            {problem.text}
          </p>
        )}
        <button type="submit" disabled={sending} className={buttonClass("primary", "md", "self-start disabled:opacity-70")}>
          <Icon icon={IconSend} />
          {sending ? t("sending") : t("send")}
        </button>
      </form>

      <div role="group" aria-labelledby="tanya-contoh" className="flex flex-col gap-2">
        <p id="tanya-contoh" className="text-sm font-semibold">
          {t("examples")}
        </p>
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setQuestion(t(`example.${key}`));
                field.current?.focus();
              }}
              className={EXAMPLE_BUTTON}
            >
              {t(`example.${key}`)}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
