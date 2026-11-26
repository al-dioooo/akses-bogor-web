import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { SignOutForm } from "@/components/akun/clear-drafts";
import { agentEnabled } from "@/lib/agen-rute";
import type { User } from "@/lib/akun";
import { currentAccount } from "@/lib/sesi";
import { buttonClass } from "@/ui/button-styles";
import { Icon } from "@/ui/icon";
import { IconCirclePlus, IconLogout, IconMenu, IconX } from "@/ui/icons";
import { DashboardNav, type DashboardNavLabels } from "./dashboard-nav";
import { dashboardGroups, initials } from "./nav";

const MENU_ID = "menu-dasbor";

/**
 * Sidebar dasbor (ADR-0046). Satu elemen untuk dua ukuran: di layar 1024 px ke atas tampil sebagai kolom kiri yang
 * menempel, di bawahnya menjadi popover yang dibuka tombol Menu. Popover yang tidak terbuka disembunyikan browser;
 * kelas `lg:` menampilkannya sebagai sidebar biasa. Tanpa sesi yang berlaku tidak ada yang dirender: halaman yang
 * mengarahkan ke Masuk, dengan alamat kembali yang benar.
 */
export async function DashboardSidebar() {
  const account = await currentAccount().catch(() => null);
  if (!account || account.user.needsCompletion) return null;
  const { user } = account;
  const [agent, t, roles] = await Promise.all([agentEnabled(), getTranslations("Dasbor.nav"), getTranslations("AkunSaya.roles")]);
  const labels: DashboardNavLabels = {
    label: t("label"),
    groups: { utama: "", kontribusi: t("groups.kontribusi"), verifikasi: t("groups.verifikasi"), admin: t("groups.admin"), akun: t("groups.akun") },
    items: {
      ringkasan: t("items.ringkasan"),
      laporan: t("items.laporan"),
      agen: t("items.agen"),
      antrean: t("items.antrean"),
      jawaban: t("items.jawaban"),
      cekUlang: t("items.cekUlang"),
      tempat: t("items.tempat"),
      tim: t("items.tim"),
      pengaturan: t("items.pengaturan"),
    },
  };
  const identity = <Identity user={user} role={roles(user.role)} />;
  return (
    <div className="flex flex-col lg:sticky lg:top-24 lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto lg:p-1">
      <div className="panel flex items-center justify-between gap-3 rounded-3xl py-2 pr-2 pl-3 lg:hidden">
        {identity}
        <button type="button" popoverTarget={MENU_ID} aria-label={t("menuTitle")} className={buttonClass("outline", "sm", "shrink-0")}>
          <Icon icon={IconMenu} />
          {t("menu")}
        </button>
      </div>
      <div
        id={MENU_ID}
        popover="auto"
        className="panel-raised inset-x-3 top-20 bottom-auto m-0 max-h-[calc(100dvh-12rem)] w-auto flex-col gap-6 overflow-y-auto rounded-3xl p-3 text-text-primary open:flex lg:static lg:flex lg:max-h-none lg:overflow-visible lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none"
      >
        <div className="flex items-center justify-between pl-3 lg:hidden">
          <p className="font-heading text-lg font-bold">{t("menuTitle")}</p>
          <button
            type="button"
            popoverTarget={MENU_ID}
            popoverTargetAction="hide"
            className="grid size-11 place-items-center rounded-full hover:bg-surface-hover"
          >
            <Icon icon={IconX} />
            <span className="sr-only">{t("close")}</span>
          </button>
        </div>
        <div className="px-1 max-lg:hidden">{identity}</div>
        <DashboardNav groups={dashboardGroups({ role: user.role, agent })} labels={labels} />
        <div className="flex flex-col gap-2 border-t border-border-subtle pt-4">
          <SignOutForm>
            <button className="flex min-h-11 w-full items-center gap-3 rounded-full px-3 font-semibold hover:bg-surface-hover">
              <Icon icon={IconLogout} className="size-5 text-icon-secondary" />
              {t("signOut")}
            </button>
          </SignOutForm>
          <Link href="/laporkan" className={buttonClass("primary", "sm", "w-full")}>
            <Icon icon={IconCirclePlus} />
            {t("report")}
          </Link>
        </div>
      </div>
    </div>
  );
}

/** Nama tampilan dan peran pemilik akun. Avatar berisi inisial; tidak ada foto profil (ADR-0029). */
function Identity({ user, role }: { user: User; role: string }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand-fill font-heading text-lg font-bold text-text-on-brand">
        {initials(user.displayName)}
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="font-heading text-lg leading-tight font-bold break-words">{user.displayName}</span>
        <span className="text-sm text-text-secondary">{role}</span>
      </span>
    </div>
  );
}

/** Tempat sidebar selagi sesi dibaca, supaya isi halaman tidak bergeser. */
export function SidebarSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-3">
      <div className="h-15 rounded-3xl bg-bg-sunken lg:h-11 lg:w-40" />
      <div className="flex flex-col gap-2 max-lg:hidden">
        {[0, 1, 2, 3].map((key) => (
          <div key={key} className="h-11 rounded-full bg-bg-sunken" />
        ))}
      </div>
    </div>
  );
}
