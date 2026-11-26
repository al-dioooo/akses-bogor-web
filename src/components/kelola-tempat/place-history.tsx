import { getFormatter, getTranslations } from "next-intl/server";
import type { HistoryEntry } from "@/lib/kelola-tempat";

/** Kunci `changes` yang bukan kolom tempat; ditampilkan terpisah atau tidak sama sekali. */
const NOT_FIELDS = new Set(["alasan", "alasanTurun", "laporan", "osm", "tayang"]);
const FIELDS = ["name", "category", "district", "location", "landmark", "description", "status", "facilities", "photos"] as const;
const ACTIONS = ["dibuat", "diubah", "dibuat_admin", "diubah_admin", "diturunkan", "ditayangkan_lagi", "dibuat_street_view", "diubah_street_view", "street_view_dibatalkan"] as const;
const PHOTO_TAGS = ["pintu_masuk", "toilet_difabel", "guiding_block", "lift", "lainnya"] as const;

/**
 * Riwayat satu tempat dari log audit (ADR-0038, ADR-0051): tindakan, pelaku dengan nama tampilan anggota tim, waktu,
 * kolom yang berubah, dan alasan admin. Foto tayang yang dihapus tampil sebagai entri sendiri dengan objek di foto dan
 * alasannya. Log tidak memuat email atau nama pelapor.
 */
export async function PlaceHistory({ items }: { items: HistoryEntry[] }) {
  const [t, tTag, format] = await Promise.all([getTranslations("KelolaTempat.history"), getTranslations("Laporkan.foto.tags"), getFormatter()]);
  /** Judul entri foto yang dihapus, dengan objek di foto bila tag-nya dikenal. */
  const photoRemoved = (tag: unknown) =>
    (PHOTO_TAGS as readonly unknown[]).includes(tag) ? t("photoRemovedTag", { tag: tTag(tag as (typeof PHOTO_TAGS)[number]) }) : t("photoRemoved");
  if (items.length === 0) return <p className="rounded-2xl bg-bg-sunken p-5">{t("empty")}</p>;
  return (
    <ol className="flex flex-col gap-3">
      {items.map((entry) => {
        const changes = entry.changes ?? {};
        const fields = Object.keys(changes).filter((key) => !NOT_FIELDS.has(key));
        const known = fields.filter((key): key is (typeof FIELDS)[number] => (FIELDS as readonly string[]).includes(key));
        const actor = entry.actor.name ?? t(entry.actor.label === "sistem" ? "actorSystem" : entry.actor.label === "skrip" ? "actorScript" : "actorDeleted");
        const photo = entry.entity === "foto";
        const action = photo
          ? photoRemoved(changes.tag)
          : (ACTIONS as readonly string[]).includes(entry.action)
            ? t(`action.${entry.action as (typeof ACTIONS)[number]}`)
            : entry.action;
        return (
          <li key={entry.id} className="panel flex flex-col gap-1 rounded-2xl p-4">
            <p className="font-heading font-bold">{action}</p>
            <p className="text-sm text-text-secondary">
              {actor} · <time dateTime={entry.at}>{format.dateTime(new Date(entry.at), { dateStyle: "long", timeStyle: "short" })}</time>
            </p>
            {!photo && known.length > 0 && <p className="text-sm">{t("changed", { fields: known.map((key) => t(`field.${key}`)).join(", ") })}</p>}
            {typeof changes.alasan === "string" && <p className="text-sm">{t("reason", { reason: changes.alasan })}</p>}
            {typeof changes.alasanTurun === "string" && <p className="text-sm text-text-secondary">{t("reasonDown", { reason: changes.alasanTurun })}</p>}
            {(entry.action === "dibuat" || entry.action === "diubah") && <p className="text-sm text-text-secondary">{t("fromReport")}</p>}
          </li>
        );
      })}
    </ol>
  );
}
