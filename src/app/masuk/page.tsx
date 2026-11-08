import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { AuthPanelSkeleton, AuthShell } from "@/components/akun/auth-shell";
import { EmailForm } from "@/components/akun/email-form";
import { GoogleSignIn } from "@/components/akun/google-sign-in";
import { getMe } from "@/lib/akun";
import { PRIVACY_POLICY_PATH } from "@/lib/kebijakan";
import { AFTER_SIGN_IN, safeReturnPath, withReturn } from "@/lib/kembali";
import { pendingSignIn, sessionToken } from "@/lib/sesi";
import { Icon } from "@/ui/icon";
import { IconInfoCircle } from "@/ui/icons";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Masuk");
  return { title: t("metaTitle") };
}

/** Masuk (Frame Akun): tombol Google, atau email lalu "Kirim kode" (FR-10). Judul tampil langsung; isian menunggu cookie dibaca. */
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
  // Tanpa client ID, tombol Google tidak tampil (ADR-0029).
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  return (
    <>
      {query.sesi === "berakhir" && (
        <p role="status" className="flex items-start gap-2 rounded-2xl bg-status-unknown-bg p-4 font-semibold text-status-unknown-fg">
          <Icon icon={IconInfoCircle} className="mt-0.5 size-5" />
          {t("sessionEnded")}
        </p>
      )}
      {googleClientId && (
        <>
          <GoogleSignIn clientId={googleClientId} kembali={kembali} />
          <p className="flex items-center gap-3 text-text-secondary before:h-px before:flex-1 before:bg-border-subtle after:h-px after:flex-1 after:bg-border-subtle">
            {t("or")}
          </p>
        </>
      )}
      <EmailForm defaultEmail={pending?.email} kembali={kembali} />
      <p className="text-sm text-text-secondary">
        {t.rich("privacy", {
          link: (chunks) => (
            <Link href={PRIVACY_POLICY_PATH} className="font-semibold text-text-brand underline underline-offset-2">
              {chunks}
            </Link>
          ),
        })}
      </p>
    </>
  );
}
