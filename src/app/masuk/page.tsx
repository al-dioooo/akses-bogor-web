import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { AuthPanelSkeleton, AuthShell } from "@/components/akun/auth-shell";
import { EmailForm } from "@/components/akun/email-form";
import { getMe } from "@/lib/akun";
import { AFTER_SIGN_IN, safeReturnPath, withReturn } from "@/lib/kembali";
import { pendingSignIn, sessionToken } from "@/lib/sesi";
import { Icon } from "@/ui/icon";
import { IconInfoCircle } from "@/ui/icons";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Masuk");
  return { title: t("metaTitle") };
}

/** Masuk (Frame Akun): email lalu "Kirim kode" (FR-10). Judul tampil langsung; isian menunggu cookie dibaca. */
export default async function Masuk({ searchParams }: PageProps<"/masuk">) {
  const t = await getTranslations("Masuk");
  return (
    <AuthShell eyebrow={t("eyebrow")} title={t("title")} accent={t("accent")} intro={t("intro")}>
      <Suspense fallback={<AuthPanelSkeleton label={t("loading")} />}>
        <SignIn searchParams={searchParams} />
      </Suspense>
    </AuthShell>
  );
}

async function SignIn({ searchParams }: { searchParams: PageProps<"/masuk">["searchParams"] }) {
  const query = await searchParams;
  const kembali = safeReturnPath(query.kembali);
  const token = await sessionToken();
  // Sudah masuk: langsung ke tujuan. getMe hanya dipanggil bila ada cookie sesi.
  const user = token ? await getMe(token).catch(() => null) : null;
  if (user) redirect(user.needsCompletion ? withReturn("/masuk/lengkapi", kembali) : (kembali ?? AFTER_SIGN_IN));

  const [t, pending] = await Promise.all([getTranslations("Masuk"), pendingSignIn()]);
  return (
    <>
      {query.sesi === "berakhir" && (
        <p role="status" className="flex items-start gap-2 rounded-2xl bg-status-unknown-bg p-4 font-semibold text-status-unknown-fg">
          <Icon icon={IconInfoCircle} className="mt-0.5 size-5" />
          {t("sessionEnded")}
        </p>
      )}
      <EmailForm defaultEmail={pending?.email} kembali={kembali} />
    </>
  );
}
