import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { AuthPanelSkeleton, AuthShell } from "@/components/akun/auth-shell";
import { DeleteForm } from "@/components/akun/delete-form";
import { getMyReports } from "@/lib/akun";
import { requireAccount } from "@/lib/sesi";
import { Icon } from "@/ui/icon";
import { IconCircleCheck, IconTrash } from "@/ui/icons";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("HapusAkun");
  return { title: t("metaTitle") };
}

/** Hapus Akun (Frame Akun, FR-13): apa yang dihapus dan yang tetap tayang menurut ADR-0024, lalu konfirmasi. */
export default async function HapusAkun() {
  const t = await getTranslations("HapusAkun");
  return (
    <AuthShell eyebrow={t("eyebrow")} title={t("title")} accent={t("accent")} intro={t("intro")}>
      <Suspense fallback={<AuthPanelSkeleton label={t("loading")} />}>
        <Confirm />
      </Suspense>
    </AuthShell>
  );
}

async function Confirm() {
  const { token, user } = await requireAccount("/akun/hapus");
  const [t, reports] = await Promise.all([getTranslations("HapusAkun"), getMyReports(token).catch(() => null)]);
  const unpublished = reports?.items.filter((report) => report.status !== "diterbitkan").length;
  return (
    <>
      <section aria-labelledby="yang-dihapus" className="flex flex-col gap-3">
        <h2 id="yang-dihapus" className="flex items-center gap-2 font-heading text-lg font-bold">
          <Icon icon={IconTrash} className="size-5 text-text-error" />
          {t("removedTitle")}
        </h2>
        <ul className="flex list-disc flex-col gap-1.5 pl-5">
          <li>{t("removedProfile")}</li>
          <li>{t("removedConsent")}</li>
          <li>{t("removedSessions")}</li>
          <li>{t("removedReports")}</li>
        </ul>
        {unpublished !== undefined && <p className="font-semibold">{t("unpublishedCount", { count: unpublished })}</p>}
      </section>
      <section aria-labelledby="yang-tetap" className="flex flex-col gap-3">
        <h2 id="yang-tetap" className="flex items-center gap-2 font-heading text-lg font-bold">
          <Icon icon={IconCircleCheck} className="size-5 text-status-accessible-fg" />
          {t("keptTitle")}
        </h2>
        <ul className="flex list-disc flex-col gap-1.5 pl-5">
          <li>{t("keptPlaces")}</li>
          <li>{t("keptAudit")}</li>
        </ul>
      </section>
      <ul className="flex list-disc flex-col gap-1.5 rounded-2xl bg-bg-sunken p-4 pl-9 text-text-secondary">
        <li>{t("noteImmediate")}</li>
        <li>{t.rich("noteEmail", { email: () => <strong className="break-all text-text-primary">{user.email}</strong> })}</li>
        <li>{t("noteBackup")}</li>
        <li>{t("noteNewAccount")}</li>
      </ul>
      <DeleteForm />
    </>
  );
}
