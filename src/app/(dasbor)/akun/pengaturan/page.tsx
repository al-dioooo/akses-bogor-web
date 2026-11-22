import type { Metadata } from "next";
import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { RenameForm } from "@/components/akun/rename-form";
import { DashboardHeading } from "@/components/dasbor/dashboard-heading";
import { requireAccount } from "@/lib/sesi";
import { Icon } from "@/ui/icon";
import { IconChevronRight } from "@/ui/icons";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Dasbor.pengaturan");
  return { title: t("metaTitle") };
}

/** Pengaturan akun (ADR-0046): data akun (FR-12), ubah nama tampilan, dan jalan ke Hapus akun (FR-13). Keluar ada di menu dasbor. */
export default async function Pengaturan() {
  const t = await getTranslations("Dasbor.pengaturan");
  const ta = await getTranslations("AkunSaya");
  return (
    <>
      <DashboardHeading id="judul-pengaturan" label={t("eyebrow")} title={t("title")} accent={t("accent")} />
      <Suspense fallback={<SettingsSkeleton label={ta("loading")} />}>
        <Settings />
      </Suspense>
    </>
  );
}

async function Settings() {
  const { user } = await requireAccount("/akun/pengaturan");
  const [t, format] = await Promise.all([getTranslations("AkunSaya"), getFormatter()]);
  return (
    <div className="grid items-start gap-6 xl:grid-cols-2">
      <section aria-labelledby="data-akun" className="panel flex flex-col gap-5 rounded-3xl p-5 sm:p-6">
        <h2 id="data-akun" className="font-heading text-xl font-bold">
          {t("dataTitle")}
        </h2>
        <dl className="flex flex-col gap-3">
          <div>
            <dt className="text-sm text-text-secondary">{t("email")}</dt>
            <dd className="font-semibold break-all">{user.email}</dd>
          </div>
          <div>
            <dt className="text-sm text-text-secondary">{t("role")}</dt>
            <dd className="font-semibold">{t(`roles.${user.role}`)}</dd>
          </div>
          <div>
            <dt className="text-sm text-text-secondary">{t("since")}</dt>
            <dd className="font-semibold">{format.dateTime(new Date(user.createdAt), { dateStyle: "long" })}</dd>
          </div>
        </dl>
        <RenameForm currentName={user.displayName} />
      </section>

      <section aria-labelledby="hapus-akun" className="flex flex-col gap-2 rounded-3xl border-2 border-border-error p-5 sm:p-6">
        <h2 id="hapus-akun" className="font-heading text-lg font-bold">
          {t("deleteTitle")}
        </h2>
        <p className="text-text-secondary">{t("deleteBody")}</p>
        <Link href="/akun/hapus" className="inline-flex min-h-11 items-center gap-1 self-start font-bold text-text-error underline underline-offset-2">
          {t("deleteLink")}
          <Icon icon={IconChevronRight} className="size-5" />
        </Link>
      </section>
    </div>
  );
}

function SettingsSkeleton({ label }: { label: string }) {
  return (
    <div role="status" aria-label={label} className="grid gap-6 xl:grid-cols-2">
      <div className="h-96 rounded-3xl bg-bg-sunken" />
      <div className="h-40 rounded-3xl bg-bg-sunken" />
    </div>
  );
}
