import { getRequestConfig } from "next-intl/server";
import { locale, timeZone } from "./config";

export default getRequestConfig(async () => ({
  locale,
  timeZone,
  messages: (await import(`../../messages/${locale}.json`)).default,
}));
