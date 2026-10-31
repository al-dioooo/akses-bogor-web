"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/ui/icon";
import { IconChevronRight, IconDots, IconX } from "@/ui/icons";
import { BOTTOM_NAV, MORE_NAV, isActive } from "./nav-items";
import type { NavLabels } from "./nav-links";

export type BottomNavLabels = NavLabels & {
  label: string;
  lainnya: string;
  lainnyaTitle: string;
  masuk: string;
  tutup: string;
};

const TAB =
  "flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl text-xs font-semibold transition-colors duration-200";

/** Bottom nav ponsel (Frame Mobile): menempel di bawah, di bawah lebar 1024 px. */
export function BottomNav({ labels, pathname }: { labels: BottomNavLabels; pathname: string | null }) {
  return (
    <nav aria-label={labels.label} className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 lg:hidden">
      <ul className="panel-raised flex gap-1 rounded-2xl p-1.5">
        {BOTTOM_NAV.map((tab) => {
          const active = isActive(tab.href, pathname);
          return (
            <li key={tab.key} className="flex flex-1">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`${TAB} ${active ? "text-text-brand" : "text-text-secondary hover:text-text-primary"}`}
              >
                <span
                  className={`grid h-7 w-12 place-items-center rounded-full transition-colors duration-200 ${active ? "bg-surface-brand-subtle" : ""}`}
                >
                  <Icon icon={tab.icon} className="size-5.5" />
                </span>
                {labels[tab.key]}
              </Link>
            </li>
          );
        })}
        <li className="flex flex-1">
          <button type="button" popoverTarget="menu-lainnya" className={`${TAB} text-text-secondary hover:text-text-primary`}>
            <span className="grid h-7 w-12 place-items-center">
              <Icon icon={IconDots} className="size-5.5" />
            </span>
            {labels.lainnya}
          </button>
        </li>
      </ul>
      <div
        id="menu-lainnya"
        popover="auto"
        aria-labelledby="menu-lainnya-judul"
        className="panel-raised inset-x-3 top-auto bottom-24 m-0 w-auto rounded-2xl p-3 text-text-primary"
      >
        <div className="flex items-center justify-between pb-1 pl-3">
          <h2 id="menu-lainnya-judul" className="font-heading font-bold">
            {labels.lainnyaTitle}
          </h2>
          <button
            type="button"
            popoverTarget="menu-lainnya"
            popoverTargetAction="hide"
            className="grid size-11 place-items-center rounded-full hover:bg-surface-hover"
          >
            <Icon icon={IconX} />
            <span className="sr-only">{labels.tutup}</span>
          </button>
        </div>
        <ul>
          {[...MORE_NAV.map((item) => ({ href: item.href, label: labels[item.key] })), { href: "/masuk", label: labels.masuk }].map(
            (item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  // Navigasi di sisi klien tidak menutup popover dengan sendirinya.
                  onClick={(event) => event.currentTarget.closest<HTMLElement>("[popover]")?.hidePopover()}
                  aria-current={isActive(item.href, pathname) ? "page" : undefined}
                  className="flex min-h-12 items-center justify-between rounded-xl px-3 font-medium hover:bg-surface-hover aria-[current=page]:text-text-brand"
                >
                  {item.label}
                  <Icon icon={IconChevronRight} className="size-5 text-text-secondary" />
                </Link>
              </li>
            ),
          )}
        </ul>
      </div>
    </nav>
  );
}

export function ActiveBottomNav({ labels }: { labels: BottomNavLabels }) {
  return <BottomNav labels={labels} pathname={usePathname()} />;
}
