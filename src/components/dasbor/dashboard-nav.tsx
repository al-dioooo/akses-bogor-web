"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { MouseEvent } from "react";
import { Icon } from "@/ui/icon";
import { isCurrent, type DashboardGroup, type DashboardGroupKey, type DashboardKey } from "./nav";

export type DashboardNavLabels = { label: string; groups: Record<DashboardGroupKey, string>; items: Record<DashboardKey, string> };

/** Di ponsel menu ada di popover; navigasi di sisi klien tidak menutupnya dengan sendirinya. */
function closeMenu(event: MouseEvent<HTMLAnchorElement>) {
  const menu = event.currentTarget.closest<HTMLElement>("[popover]");
  if (menu?.matches(":popover-open")) menu.hidePopover();
}

/**
 * Menu dasbor. Bagian bernomor seperti label judul (ADR-0027); nomornya hanya hiasan. Menu yang sedang dibuka ditandai
 * `aria-current="page"` dan pil tinta, tidak hanya warna. Tanpa elemen judul, supaya judul halaman tetap h1 pertama.
 */
export function DashboardNav({ groups, labels }: { groups: DashboardGroup[]; labels: DashboardNavLabels }) {
  const pathname = usePathname();
  const labelled = groups.filter((group) => group.key !== "utama");
  return (
    <nav aria-label={labels.label} className="flex flex-col gap-5">
      {groups.map((group) => {
        const number = labelled.indexOf(group) + 1;
        return (
          <div key={group.key} className="flex flex-col gap-1">
            {number > 0 && (
              <p id={`menu-dasbor-${group.key}`} className="lbl px-3 pb-1">
                <span aria-hidden="true">{String(number).padStart(2, "0")} / </span>
                {labels.groups[group.key]}
              </p>
            )}
            <ul aria-labelledby={number > 0 ? `menu-dasbor-${group.key}` : undefined} className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const current = isCurrent(item, pathname);
                return (
                  <li key={item.key}>
                    <Link
                      href={item.href}
                      onClick={closeMenu}
                      aria-current={current ? "page" : undefined}
                      className={`flex min-h-11 items-center gap-3 rounded-full px-3 font-semibold transition-colors duration-200 ${
                        current ? "bg-text-primary text-bg-canvas" : "text-text-primary hover:bg-surface-hover"
                      }`}
                    >
                      <Icon icon={item.icon} className={`size-5 ${current ? "" : "text-icon-secondary"}`} />
                      {labels.items[item.key]}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}
