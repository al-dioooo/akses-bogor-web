import type messages from "../messages/id.json";
import type { locale } from "./i18n/config";

// Kunci pesan dicek saat typecheck: t("kunci-salah") gagal dikompilasi.
declare module "next-intl" {
  interface AppConfig {
    Locale: typeof locale;
    Messages: typeof messages;
  }
}
