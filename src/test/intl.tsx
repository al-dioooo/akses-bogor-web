import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import messages from "../../messages/id.json";

/** Pembungkus tes komponen: teks dari messages/id.json yang sama dengan aplikasi. */
export function WithIntl({ children }: { children: ReactNode }) {
  return (
    <NextIntlClientProvider locale="id" timeZone="Asia/Jakarta" messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
