import { getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { Suspense } from "react";
import { AddMemberForm, RemoveMemberForm } from "@/components/verifikasi/team-forms";
import { getTeam } from "@/lib/verifikasi";
import { verifierSession } from "@/lib/verifikator";
import { Icon } from "@/ui/icon";
import { IconShieldCheck, IconUser } from "@/ui/icons";

/** Tim verifikator untuk admin (FR-36, ADR-0035): siapa saja verifikator dan admin, tambah, dan cabut. */
export default async function Tim() {
  const t = await getTranslations("Verifikasi.queue");
  return (
    <Suspense fallback={<p role="status">{t("loading")}</p>}>
      <Team />
    </Suspense>
  );
}

async function Team() {
  await connection();
  const session = await verifierSession("/verifikasi/tim");
  if (!session) return null;
  const t = await getTranslations("Verifikasi.tim");
  if (session.user.role !== "admin") return <p className="max-w-prose rounded-2xl bg-bg-sunken p-5">{t("adminOnly")}</p>;
  const { items } = await getTeam(session.token);
  return (
    <div className="grid items-start gap-8 lg:grid-cols-[1fr_22rem]">
      <section aria-labelledby="isi-meja" className="flex flex-col gap-4">
        <h2 id="isi-meja" className="font-heading text-2xl font-bold">
          {t("heading", { count: items.length })}
        </h2>
        <p className="max-w-prose text-text-secondary">{t("intro")}</p>
        <ul className="flex flex-col divide-y-2 divide-border-subtle rounded-3xl border-2 border-border-subtle bg-surface-raised">
          {items.map((member) => (
            <li key={member.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-bg-sunken text-icon-brand">
                  <Icon icon={member.role === "admin" ? IconShieldCheck : IconUser} className="size-5.5" />
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="font-heading text-lg font-bold break-words">{member.displayName}</span>
                  <span className="text-sm break-all text-text-secondary">{member.email}</span>
                  <span className="lbl mt-1">{t(`role.${member.role}`)}</span>
                </span>
              </div>
              {member.role === "admin" ? (
                <p className="text-sm text-text-secondary sm:max-w-48 sm:text-right">{t("adminNote")}</p>
              ) : (
                <RemoveMemberForm userId={member.id} name={member.displayName} />
              )}
            </li>
          ))}
        </ul>
      </section>
      <section aria-labelledby="tambah-verifikator" className="flex flex-col gap-4 rounded-3xl border-2 border-border-strong p-5 sm:p-6">
        <h2 id="tambah-verifikator" className="font-heading text-xl font-bold">
          {t("addTitle")}
        </h2>
        <AddMemberForm />
      </section>
    </div>
  );
}
