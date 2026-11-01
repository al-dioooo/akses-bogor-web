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
              className={`inline-flex min-h-11 items-center rounded-full px-3.5 text-[0.9375rem] font-semibold transition-colors duration-200 ${
                active ? "bg-text-primary text-bg-canvas" : "text-text-primary hover:bg-surface-hover"
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

/** Header tanpa latar di atas halaman, lalu berlatar dan bergaris bawah setelah digulir 24 px. */
export function StickyHeader({ children }: { children: ReactNode }) {
  const scrolled = useSyncExternalStore(
    subscribeScroll,
    () => window.scrollY > 24,
    () => false,
  );
  return (
    <header
      data-scrolled={scrolled || undefined}
      className="sticky top-0 z-40 border-b border-transparent transition-[background-color,border-color] duration-300 ease-out-expo data-scrolled:border-border-subtle data-scrolled:bg-bg-canvas"
    >
      {children}
    </header>
  );
}
