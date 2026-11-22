import Link from "next/link";
import type { ReactNode } from "react";
import { Suspense } from "react";
import { Icon } from "@/ui/icon";
import { IconArrowRight } from "@/ui/icons";
import { LoadErrorBoundary } from "@/ui/load-error";

/** Judul bagian Ringkasan dengan tautan ke halaman lengkapnya di kanan. */
export function SectionTitle({ id, title, action }: { id: string; title: string; action?: { href: string; label: string } }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-4">
      <h2 id={id} className="font-heading text-2xl font-bold">
        {title}
      </h2>
      {action && (
        <Link href={action.href} className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-text-brand underline-offset-4 hover:underline">
          {action.label}
          <Icon icon={IconArrowRight} className="size-4.5" />
        </Link>
      )}
    </div>
  );
}

/**
 * Satu bagian Ringkasan yang dimuat sendiri: kerangka selagi memuat, dan pesan galat dengan Coba lagi bila API gagal,
 * tanpa mengosongkan bagian lain.
 */
export function Part({ label, rows = 2, children }: { label: string; rows?: number; children: ReactNode }) {
  return (
    <LoadErrorBoundary>
      <Suspense fallback={<PartSkeleton label={label} rows={rows} />}>{children}</Suspense>
    </LoadErrorBoundary>
  );
}

function PartSkeleton({ label, rows }: { label: string; rows: number }) {
  return (
    <div role="status" className="flex flex-col gap-3">
      <span className="sr-only">{label}</span>
      <span aria-hidden="true" className="h-8 w-56 rounded-full bg-bg-sunken" />
      {Array.from({ length: rows }, (_, index) => (
        <span key={index} aria-hidden="true" className="h-20 rounded-3xl bg-bg-sunken" />
      ))}
    </div>
  );
}
