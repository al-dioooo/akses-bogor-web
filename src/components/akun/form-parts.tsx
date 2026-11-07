"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Icon } from "@/ui/icon";
import { IconAlertTriangle, IconCircleCheck } from "@/ui/icons";
import type { FormState } from "./form-state";

/** Galat di bawah satu kolom. `id` dipakai `aria-describedby` kolomnya. */
export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="flex items-start gap-2 font-semibold text-text-error">
      <Icon icon={IconAlertTriangle} className="mt-0.5 size-5" />
      {message}
    </p>
  );
}

/** Galat untuk seluruh formulir, mis. server tidak bisa dihubungi. Dibacakan langsung. */
export function FormAlert({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="flex items-start gap-2 rounded-2xl border-2 border-border-error p-4 font-semibold text-text-error">
      <Icon icon={IconAlertTriangle} className="mt-0.5 size-5" />
      {message}
    </p>
  );
}

/** Kotak status yang selalu ada di DOM, supaya pesan yang muncul belakangan tetap dibacakan pembaca layar. */
export function FormNotice({ message, children }: { message?: string; children?: ReactNode }) {
  return (
    <div role="status" className="empty:hidden">
      {message && (
        <p className="flex items-start gap-2 rounded-2xl bg-status-accessible-bg p-4 font-semibold text-status-accessible-fg">
          <Icon icon={IconCircleCheck} className="mt-0.5 size-5" />
          {message}
        </p>
      )}
      {children}
    </div>
  );
}

/** Setelah Server Action menjawab galat kolom, fokus pindah ke kolom itu supaya galatnya langsung terbaca. */
export function useFocusOnError(state: FormState, fields: Record<string, React.RefObject<HTMLElement | null>>) {
  const last = useRef<FormState | null>(null);
  useEffect(() => {
    if (state === last.current) return;
    last.current = state;
    const field = state.error?.field;
    if (field) fields[field]?.current?.focus();
  }, [state, fields]);
}
