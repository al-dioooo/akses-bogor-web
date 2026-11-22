import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { buttonClass } from "@/ui/button-styles";
import { initials } from "../nav";
import { team } from "./data";
import { SectionTitle } from "./section";

const SHOWN = 5;

/**
 * Tim verifikator di Ringkasan untuk admin (FR-36, ADR-0035): jumlah verifikator dan admin, dan nama beberapa anggota.
 * Email anggota hanya ada di halaman Tim, tidak di Ringkasan.
 */
export async function TeamSummary({ token }: { token: string }) {
  const [t, roles, { items }] = await Promise.all([getTranslations("Dasbor.ringkasan.tim"), getTranslations("AkunSaya.roles"), team(token)]);
  const verifiers = items.filter((member) => member.role === "verifikator").length;
  return (
    <section aria-labelledby="ringkasan-tim" className="flex flex-col gap-4">
      <SectionTitle id="ringkasan-tim" title={t("title")} action={{ href: "/verifikasi/tim", label: t("manage") }} />
      <div className="panel flex flex-col gap-4 rounded-3xl p-5">
        <p className="text-text-secondary">{t("counts", { verifiers, admins: items.length - verifiers })}</p>
        {verifiers === 0 ? (
          <div className="flex flex-col items-start gap-3">
            <p>{t("empty")}</p>
            <Link href="/verifikasi/tim" className={buttonClass("outline", "sm")}>
              {t("add")}
            </Link>
          </div>
        ) : null}
        <ul className="flex flex-col gap-3">
          {items.slice(0, SHOWN).map((member) => (
            <li key={member.id} className="flex min-w-0 items-center gap-3">
              <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-xl bg-surface-brand-subtle font-heading font-bold text-text-brand">
                {initials(member.displayName)}
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="font-semibold break-words">{member.displayName}</span>
                <span className="text-sm text-text-secondary">{roles(member.role)}</span>
              </span>
            </li>
          ))}
        </ul>
        {items.length > SHOWN && <p className="text-sm text-text-secondary">{t("more", { count: items.length - SHOWN })}</p>}
      </div>
    </section>
  );
}
