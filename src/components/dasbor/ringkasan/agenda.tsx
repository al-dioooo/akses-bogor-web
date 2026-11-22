import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { URGENT_DAYS, openClarifications } from "@/lib/dasbor";
import { Icon } from "@/ui/icon";
import { IconAlertTriangle, IconArrowRight, IconCircleCheck, IconClock, IconHelpCircle, type Glyph } from "@/ui/icons";
import { myReports } from "./data";
import { SectionTitle } from "./section";

export type Task = {
  key: string;
  href: string;
  icon: Glyph;
  /** Kelas warna latar dan ikon untuk ubin ikon. */
  tone: string;
  title: string;
  detail: string;
  due?: { label: string; date: string; urgent: boolean };
};

/** Yang menunggu pemilik akun (ADR-0046): untuk saat ini pertanyaan klarifikasi yang masih bisa dijawab (ADR-0036). */
export async function Agenda({ token, now }: { token: string; now: Date }) {
  const [t, format, { items }] = await Promise.all([getTranslations("Dasbor.ringkasan.agenda"), getFormatter(), myReports(token)]);
  const tasks: Task[] = openClarifications(items, now).map(({ report, dueAt, daysLeft }) => ({
    key: report.id,
    href: `/akun/laporan/${report.id}`,
    icon: IconHelpCircle,
    tone: "bg-status-partial-bg text-status-partial-fg",
    title: t("clarify"),
    detail: report.placeName ?? t("unnamed"),
    due: { label: t("daysLeft", { days: daysLeft }), date: t("due", { date: format.dateTime(new Date(dueAt), { dateStyle: "long" }) }), urgent: daysLeft <= URGENT_DAYS },
  }));
  return <AgendaList title={t("title")} tasks={tasks} empty={{ title: t("emptyTitle"), body: t("emptyBody") }} />;
}

/** Daftar tugas. Tenggat yang mendesak memakai teks, ikon, dan warna, tidak hanya warna. */
export function AgendaList({ title, tasks, empty }: { title: string; tasks: Task[]; empty: { title: string; body: string } }) {
  return (
    <section aria-labelledby="ringkasan-agenda" className="flex flex-col gap-4">
      <SectionTitle id="ringkasan-agenda" title={title} />
      {tasks.length === 0 ? (
        <div className="flex items-center gap-4 rounded-3xl border-2 border-dashed border-border-subtle p-5">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-status-accessible-bg text-status-accessible-fg">
            <Icon icon={IconCircleCheck} className="size-6" />
          </span>
          <p className="flex flex-col">
            <span className="font-heading text-lg font-bold">{empty.title}</span>
            <span className="text-text-secondary">{empty.body}</span>
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {tasks.map((task) => (
            <li key={task.key}>
              <Link href={task.href} className="panel group flex items-center gap-4 rounded-3xl p-4 transition-colors duration-200 hover:border-border-strong sm:p-5">
                <span className={`grid size-12 shrink-0 place-items-center rounded-2xl ${task.tone}`}>
                  <Icon icon={task.icon} className="size-6" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="font-heading text-lg leading-snug font-bold">{task.title}</span>
                  <span className="break-words text-text-secondary">{task.detail}</span>
                  {task.due && (
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-bold ${
                          task.due.urgent ? "bg-status-inaccessible-bg text-status-inaccessible-fg" : "bg-bg-sunken text-text-primary"
                        }`}
                      >
                        <Icon icon={task.due.urgent ? IconAlertTriangle : IconClock} className="size-4" />
                        {task.due.label}
                      </span>
                      <span className="text-text-secondary">{task.due.date}</span>
                    </span>
                  )}
                </span>
                <Icon icon={IconArrowRight} className="size-5 text-icon-secondary transition-transform duration-200 group-hover:translate-x-0.5" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
