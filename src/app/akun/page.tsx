import type { Metadata } from "next";
import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { MyReports } from "@/components/akun/my-reports";
import { RenameForm } from "@/components/akun/rename-form";
import { getMyReports } from "@/lib/akun";
import { requireAccount } from "@/lib/sesi";
import { buttonClass } from "@/ui/button-styles";
import { Icon } from "@/ui/icon";
import { IconChevronRight, IconLogout } from "@/ui/icons";
import { LoadErrorBoundary } from "@/ui/load-error";
import { SectionHeading } from "@/ui/section-heading";
import { signOut } from "./actions";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("AkunSaya");
  return { title: t("metaTitle") };
}

/** Akun Saya (Frame Akun): Laporan saya (FR-14), data akun (FR-12), Keluar, dan jalan ke Hapus akun (FR-13). */
export default async function AkunSaya() {
  const t = await getTranslations("AkunSaya");
  return (
    <main id="konten" className="page-width flex flex-1 flex-col gap-8 py-10 sm:py-16">
      <SectionHeading id="judul-akun" level={1} label={t("eyebrow")} title={t("title")} accent={t("accent")} />
      <Suspense fallback={<AccountSkeleton label={t("loading")} />}>
        <Account />
      </Suspense>
    </main>
  );
}

async function Account() {
  const { token, user } = await requireAccount("/akun");
  const [t, tl, format] = await Promise.all([getTranslations("AkunSaya"), getTranslations("LaporanSaya"), getFormatter()]);
  return (
    <div className="grid items-start gap-8 lg:grid-cols-[1fr_24rem]">
      <section aria-labelledby="laporan-saya" className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 id="laporan-saya" className="font-heading text-2xl font-bold">
            {tl("title")}
          </h2>
          <p className="text-text-secondary">{tl("intro")}</p>
        </div>
        <LoadErrorBoundary>
          <Suspense fallback={<p role="status">{tl("loading")}</p>}>
            <ReportList token={token} />
          </Suspense>
        </LoadErrorBoundary>
      </section>

      <div className="flex flex-col gap-4">
        <section aria-labelledby="data-akun" className="panel flex flex-col gap-5 rounded-3xl p-5 sm:p-6">
          <h2 id="data-akun" className="font-heading text-xl font-bold">
            {t("dataTitle")}
          </h2>
          <dl className="flex flex-col gap-3">
            <div>
              <dt className="text-sm text-text-secondary">{t("email")}</dt>
              <dd className="font-semibold break-all">{user.email}</dd>
            </div>
            {user.role !== "pengguna" && (
              <div>
                <dt className="text-sm text-text-secondary">{t("role")}</dt>
                <dd className="font-semibold">{t(`roles.${user.role}`)}</dd>
              </div>
            )}
            <div>
              <dt className="text-sm text-text-secondary">{t("since")}</dt>
              <dd className="font-semibold">{format.dateTime(new Date(user.createdAt), { dateStyle: "long" })}</dd>
            </div>
          </dl>
          <RenameForm currentName={user.displayName} />
        </section>

        <form action={signOut}>
          <button className={buttonClass("outline", "md", "w-full")}>
            <Icon icon={IconLogout} />
            {t("signOut")}
          </button>
        </form>

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
    </div>
  );
}

async function ReportList({ token }: { token: string }) {
  const { items } = await getMyReports(token);
  return <MyReports reports={items} />;
}

function AccountSkeleton({ label }: { label: string }) {
  return (
    <div role="status" aria-label={label} className="grid gap-8 lg:grid-cols-[1fr_24rem]">
      <div className="h-64 rounded-3xl bg-bg-sunken" />
      <div className="h-80 rounded-3xl bg-bg-sunken" />
    </div>
  );
}
