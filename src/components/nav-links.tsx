"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore, type ReactNode } from "react";
import { MAIN_NAV, isActive, type NavKey } from "./nav-items";

export type NavLabels = Record<NavKey, string>;

/** Menu desktop. `pathname` kosong saat prerender, sehingga belum ada menu yang aktif. */
export function MainNavList({ labels, pathname }: { labels: NavLabels; pathname: string | null }) {
  return (
    <ul className="flex items-center gap-0.5">
      {MAIN_NAV.map((item) => {
        const active = isActive(item.href, pathname);
        return (
          <li key={item.key}>
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`inline-flex min-h-11 items-center rounded-full px-3.5 text-sm transition-colors duration-200 ${
                active
                  ? "bg-surface-brand-subtle font-semibold text-text-brand"
                  : "font-medium text-text-secondary hover:bg-surface-hover hover:text-text-primary"
              }`}
            >
              {labels[item.key]}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function ActiveMainNavList({ labels }: { labels: NavLabels }) {
  return <MainNavList labels={labels} pathname={usePathname()} />;
}

const subscribeScroll = (onChange: () => void) => {
  window.addEventListener("scroll", onChange, { passive: true });
  return () => window.removeEventListener("scroll", onChange);
};

/** Header bening di atas aurora, lalu menjadi kaca setelah halaman digulir 24 px. */
export function StickyHeader({ children }: { children: ReactNode }) {
  const scrolled = useSyncExternalStore(
    subscribeScroll,
    () => window.scrollY > 24,
    () => false,
  );
  return (
    <header
      data-scrolled={scrolled || undefined}
      className="sticky top-0 z-40 border-b border-transparent transition-[background-color,border-color,box-shadow] duration-300 ease-out-expo data-scrolled:border-border-glass data-scrolled:bg-surface-glass-strong data-scrolled:shadow-[0_8px_32px_var(--color-shadow-glass)] data-scrolled:backdrop-blur-glass"
    >
      {children}
    </header>
  );
}
