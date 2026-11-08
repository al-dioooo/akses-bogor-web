import { QueuePage } from "@/components/verifikasi/queue-page";

/** Laporan yang menunggu jawaban klarifikasi pelapor, dengan tenggatnya (ADR-0036). */
export default function MenungguJawaban() {
  return <QueuePage status="klarifikasi" path="/verifikasi/jawaban" />;
}
