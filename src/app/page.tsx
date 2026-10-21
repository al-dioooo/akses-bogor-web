import { getTranslations } from "next-intl/server";

export default async function Home() {
  const t = await getTranslations("Beranda");
  return (
    <main id="konten" className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-4 px-4 py-16">
      <h1 className="font-heading text-4xl font-bold tracking-tight">{t("title")}</h1>
      <p className="text-lg">{t("intro")}</p>
      <p>{t("status")}</p>
    </main>
  );
}
