import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { locale } from "@/i18n/config";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Metadata");
  return {
    title: { default: t("title"), template: `%s · ${t("title")}` },
    description: t("description"),
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const t = await getTranslations("Layout");
  return (
    <html lang={locale} className={`${inter.variable} ${plusJakartaSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <a
          href="#konten"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:inline-flex focus:min-h-11 focus:items-center focus:rounded-lg focus:bg-surface-inverse focus:px-4 focus:text-text-on-inverse focus:outline-2 focus:outline-offset-2 focus:outline-focus-ring"
        >
          {t("skipLink")}
        </a>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
