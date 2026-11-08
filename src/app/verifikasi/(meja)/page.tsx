import { QueuePage } from "@/components/verifikasi/queue-page";

/** Antrean verifikasi, terlama dulu (FR-30). */
export default function Antrean() {
  return <QueuePage status="menunggu" path="/verifikasi" />;
}
