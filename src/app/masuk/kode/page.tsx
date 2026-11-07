import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { AuthPanelSkeleton, AuthShell } from "@/components/akun/auth-shell";
import { CodeForm } from "@/components/akun/code-form";
import { ResendCode } from "@/components/akun/resend-code";
import { safeReturnPath, withReturn } from "@/lib/kembali";
import { pendingSignIn, secondsUntilResend } from "@/lib/sesi";
import { buttonClass } from "@/ui/button-styles";
import { Icon } from "@/ui/icon";
import { IconArrowLeft } from "@/ui/icons";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("KodeMasuk");
  return { title: t("metaTitle") };
}

/** Kode Masuk (Frame Akun): satu kolom kode, kirim ulang setelah 60 detik, dan "Ganti email" (ADR-0014). */
export default async function KodeMasuk({ searchParams }: PageProps<"/masuk/kode">) {
  const t = await getTranslations("KodeMasuk");
  return (
    <AuthShell eyebrow={t("eyebrow")} title={t("title")} accent={t("accent")}>
      <Suspense fallback={<AuthPanelSkeleton label={t("loading")} />}>
        <CodeStep searchParams={searchParams} />
      </Suspense>
    </AuthShell>
  );
}

async function CodeStep({ searchParams }: { searchParams: PageProps<"/masuk/kode">["searchParams"] }) {
  const kembali = safeReturnPath((await searchParams).kembali);
  const pending = await pendingSignIn();
  if (!pending) redirect(withReturn("/masuk", kembali));
  const t = await getTranslations("KodeMasuk");
  // Sisa jeda dihitung dari jam saat request, bukan saat prerender.
  await connection();
  const wait = secondsUntilResend(pending);
  return (
    <>
      <div className="flex flex-col gap-2">
        <p>
          {t("sentTo")} <strong className="break-all">{pending.email}</strong>
        </p>
        <ul className="list-disc pl-5 text-text-secondary">
          <li>{t("expiry")}</li>
          <li>{t("spam")}</li>
        </ul>
      </div>
      <CodeForm kembali={kembali} />
      <ResendCode initialWait={wait} />
      {/* Muat ulang penuh, bukan navigasi klien: router menyimpan tampilan Masuk sebelum email diisi. */}
      <a href={withReturn("/masuk", kembali)} className={buttonClass("ghost", "sm", "self-start")}>
        <Icon icon={IconArrowLeft} />
        {t("changeEmail")}
      </a>
    </>
  );
}
