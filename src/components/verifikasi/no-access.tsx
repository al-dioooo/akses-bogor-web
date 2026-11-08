import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { buttonClass } from "@/ui/button-styles";
import { Icon } from "@/ui/icon";
import { IconShieldCheck } from "@/ui/icons";

/** Untuk akun tanpa peran verifikator: tidak ada data laporan yang dimuat. */
export async function NoAccess() {
  const t = await getTranslations("Verifikasi.noAccess");
  return (
    <section aria-labelledby="tanpa-akses" className="flex max-w-xl flex-col items-start gap-4 rounded-3xl bg-bg-sunken p-6 sm:p-8">
      <span className="grid size-12 place-items-center rounded-2xl bg-surface-raised text-icon-brand">
        <Icon icon={IconShieldCheck} className="size-6" />
      </span>
      <h2 id="tanpa-akses" className="font-heading text-xl font-bold">
        {t("title")}
      </h2>
      <p className="text-text-secondary">{t("body")}</p>
      <Link href="/akun" className={buttonClass("outline", "sm")}>
        {t("back")}
      </Link>
    </section>
  );
}
