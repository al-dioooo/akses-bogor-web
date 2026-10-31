"use client";

import { catchError, type ErrorInfo } from "next/error";
import { useTranslations } from "next-intl";
import { buttonClass } from "./button-styles";
import { Icon } from "./icon";
import { IconAlertTriangle } from "./icons";

function LoadError({ retry }: { retry: () => void }) {
  const t = useTranslations("GagalMemuat");
  return (
    <div role="alert" className="panel flex flex-col items-start gap-4 rounded-2xl p-6 sm:flex-row sm:items-center">
      <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-status-partial-bg text-status-partial-fg">
        <Icon icon={IconAlertTriangle} className="size-6" />
      </span>
      <div className="flex-1">
        <p className="font-heading text-lg font-semibold">{t("title")}</p>
        <p className="text-text-secondary">{t("body")}</p>
      </div>
      <button type="button" onClick={retry} className={buttonClass("outline", "sm")}>
        {t("retry")}
      </button>
    </div>
  );
}

/** Batas galat untuk bagian yang mengambil data dari API: menampilkan pesan dan tombol coba lagi. */
export const LoadErrorBoundary = catchError((_props: object, { retry }: ErrorInfo) => <LoadError retry={retry} />);
