import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { AuthPanelSkeleton, AuthShell } from "@/components/akun/auth-shell";
import { SignOutForm } from "@/components/akun/clear-drafts";
import { CompleteForm } from "@/components/akun/complete-form";
import { PRIVACY_POLICY_VERSION } from "@/lib/kebijakan";
import { AFTER_SIGN_IN, safeReturnPath } from "@/lib/kembali";
import { requireAccount } from "@/lib/sesi";
import { buttonClass } from "@/ui/button-styles";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Lengkapi");
  return { title: t("metaTitle") };
}

/** Lengkapi Akun (Frame Akun): hanya saat masuk pertama, atau saat Kebijakan Privasi berganti versi (FR-11). */
export default async function Lengkapi({ searchParams }: PageProps<"/masuk/lengkapi">) {
  const t = await getTranslations("Lengkapi");
  return (
    <AuthShell eyebrow={t("eyebrow")} title={t("title")} accent={t("accent")} intro={t("intro")}>
      <Suspense fallback={<AuthPanelSkeleton label={t("loading")} />}>
        <Complete searchParams={searchParams} />
      </Suspense>
    </AuthShell>
  );
}

async function Complete({ searchParams }: { searchParams: PageProps<"/masuk/lengkapi">["searchParams"] }) {
  const kembali = safeReturnPath((await searchParams).kembali);
  const { user } = await requireAccount(kembali ?? AFTER_SIGN_IN, { allowIncomplete: true });
  if (!user.needsCompletion) redirect(kembali ?? AFTER_SIGN_IN);
  const [t, format] = await Promise.all([getTranslations("Lengkapi"), getFormatter()]);
  const versionLabel = format.dateTime(new Date(`${PRIVACY_POLICY_VERSION}T00:00:00+07:00`), { dateStyle: "long" });
  return (
    <>
      <p>
        {t("signedInAs")} <strong className="break-all">{user.email}</strong>
      </p>
      <CompleteForm defaultName={user.displayName} kembali={kembali} versionLabel={versionLabel} />
      <SignOutForm className="flex flex-col gap-2 border-t border-border-subtle pt-6">
        <p className="text-text-secondary">{t("declineHint")}</p>
        <button className={buttonClass("ghost", "sm", "self-start")}>{t("decline")}</button>
      </SignOutForm>
    </>
  );
}
