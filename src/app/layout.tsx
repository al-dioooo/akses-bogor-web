import type { Metadata } from "next";
import { Bricolage_Grotesque, IBM_Plex_Mono, Instrument_Serif, Inter } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { DISPLAY_SCRIPT } from "@/components/display-script";
import { SiteBottomNav, SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { locale } from "@/i18n/config";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

// Judul, label bernomor, dan satu kata aksen di judul (ADR-0027).
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  // Optical size membuat huruf lebih rapat di ukuran judul besar.
  axes: ["opsz"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["500", "600"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: "italic",
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
    // Skrip tampilan mengubah data-theme dan data-motion sebelum hydration.
    <html lang={locale} suppressHydrationWarning className={`${inter.variable} ${bricolage.variable} ${plexMono.variable} ${instrumentSerif.variable} h-full antialiased`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: DISPLAY_SCRIPT }} />
      </head>
      {/* Ruang bawah setinggi Bottom nav supaya konten dan fokus tidak tertutup (WCAG 2.4.11). */}
      <body id="atas" className="flex min-h-full flex-col pb-28 lg:pb-0">
        <a
          href="#konten"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:inline-flex focus:min-h-11 focus:items-center focus:rounded-full focus:bg-surface-inverse focus:px-4 focus:text-text-on-inverse focus:outline-2 focus:outline-offset-2 focus:outline-focus-ring"
        >
          {t("skipLink")}
        </a>
        <NextIntlClientProvider>
          <SiteHeader />
          {children}
          <SiteFooter />
          <SiteBottomNav />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
