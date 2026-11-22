import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { buttonClass } from "@/ui/button-styles";
import { Icon } from "@/ui/icon";
import { IconCheck, IconCirclePlus, IconRoute } from "@/ui/icons";

const STOPS = ["akun", "datang", "isi", "periksa"] as const;
/** Akun yang sudah lengkap sudah melewati halte pertama; halte berikutnya adalah tempat pertama. */
const CURRENT = 1;

/**
 * Panduan awal untuk akun yang belum pernah melapor (ADR-0046), digambar sebagai rute dengan empat halte seperti
 * ilustrasi "Halte ke pintu" (ADR-0027). Keadaan setiap halte ditulis sebagai teks; halte yang sedang dituju ditandai
 * `aria-current="step"`. Garis rute dan nomor hanya hiasan.
 */
export async function FirstRoute({ agent }: { agent: boolean }) {
  const t = await getTranslations("Dasbor.ringkasan.rute");
  return (
    <div className="@container flex flex-col gap-7 rounded-[2rem] bg-surface-inverse p-6 text-text-on-inverse sm:p-8">
      <div className="flex flex-col gap-2">
        <p className="font-mono text-xs font-medium tracking-[0.08em] text-text-on-inverse-secondary uppercase">{t("eyebrow")}</p>
        <h3 className="display text-[clamp(1.75rem,1.4rem+1.2vw,2.25rem)] leading-tight">
          {t("title")} <span className="font-accent font-normal italic">{t("accent")}</span>
        </h3>
        <p className="max-w-xl text-text-on-inverse-secondary">{t("intro")}</p>
      </div>
      {/* Rute mendatar hanya bila kotaknya cukup lebar (container query), bukan menurut lebar layar: di samping kolom
          kanan Ringkasan kotaknya sempit, jadi rute tetap tegak. */}
      <ol className="grid @2xl:grid-cols-4">
        {STOPS.map((stop, index) => {
          const state = index < CURRENT ? "done" : index === CURRENT ? "current" : "next";
          return (
            <li key={stop} aria-current={state === "current" ? "step" : undefined} className="relative flex flex-col gap-1 pb-7 pl-15 last:pb-0 @2xl:pt-15 @2xl:pr-5 @2xl:pb-0 @2xl:pl-0">
              {index < STOPS.length - 1 && (
                <span
                  aria-hidden="true"
                  className="absolute top-12 bottom-1 left-5.5 border-l-2 border-dashed border-text-on-inverse/30 @2xl:top-5.5 @2xl:right-1 @2xl:bottom-auto @2xl:left-13 @2xl:border-t-2 @2xl:border-l-0"
                />
              )}
              <span
                aria-hidden="true"
                className={`absolute top-0 left-0 grid size-11 place-items-center rounded-full font-mono font-semibold ${
                  state === "done"
                    ? "bg-status-accessible-solid text-status-accessible-on-solid"
                    : state === "current"
                      ? "bg-text-highlight text-surface-inverse outline-4 outline-offset-2 outline-text-highlight/30 outline-solid"
                      : "border-2 border-text-on-inverse/40"
                }`}
              >
                {state === "done" ? <Icon icon={IconCheck} className="size-5" /> : String(index + 1).padStart(2, "0")}
              </span>
              <span className={`text-xs font-semibold tracking-[0.06em] uppercase ${state === "current" ? "text-text-highlight" : "text-text-on-inverse-secondary"}`}>
                {t(`state.${state}`)}
              </span>
              <span className="font-heading text-lg leading-snug font-bold">{t(`stops.${stop}.title`)}</span>
              <span className="text-sm text-text-on-inverse-secondary">{t(`stops.${stop}.body`)}</span>
            </li>
          );
        })}
      </ol>
      <div className="flex flex-wrap gap-3">
        <Link href="/laporkan" className={buttonClass("primary", "md")}>
          <Icon icon={IconCirclePlus} />
          {t("report")}
        </Link>
        {agent && (
          <Link
            href="/laporkan/bantu-memetakan"
            className="inline-flex min-h-13 items-center justify-center gap-2 rounded-full border-2 border-text-on-inverse/40 px-6 font-bold transition-colors duration-200 hover:bg-text-on-inverse/10"
          >
            <Icon icon={IconRoute} />
            {t("agent")}
          </Link>
        )}
      </div>
    </div>
  );
}
