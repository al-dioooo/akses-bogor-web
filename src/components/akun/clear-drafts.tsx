"use client";

import { useEffect, type ReactNode } from "react";
import { signOut } from "@/app/akun/actions";
import { clearAllDrafts } from "@/lib/draf";

/**
 * Keluar: draf Laporkan di perangkat ini dihapus dulu, lalu sesi dicabut (ADR-0033). Draf tidak terikat ke akun, jadi
 * di perangkat bersama draf tidak boleh tertinggal untuk pengguna berikutnya.
 */
export function SignOutForm({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <form
      className={className}
      action={async () => {
        await clearAllDrafts();
        await signOut();
      }}
    >
      {children}
    </form>
  );
}

/** Menghapus draf Laporkan di perangkat ini setelah akun dihapus (ADR-0024, ADR-0033). Tidak menampilkan apa pun. */
export function ClearDrafts() {
  useEffect(() => {
    void clearAllDrafts();
  }, []);
  return null;
}
