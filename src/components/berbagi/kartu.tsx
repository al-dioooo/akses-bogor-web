import type { Status } from "@/lib/api";
import type { Glyph } from "@/ui/icons";
import mark from "@/ui/logo-mark.json";
import { STATUS_ICON } from "@/ui/place-icons";
import { tokenColor } from "./token";

/**
 * Kartu gambar berbagi (OpenGraph) untuk `ImageResponse` dari next/og (issue #114). Gaya mengikuti ADR-0027: permukaan
 * datar, Ungu Inklusi, dan status selalu teks + ikon + warna. Dirender oleh Satori, jadi hanya gaya inline dan
 * `display: flex`, tanpa kelas Tailwind atau variable CSS. Huruf memakai bawaan next/og.
 */

const C = {
  brand: tokenColor("color/brand/fill"),
  onBrand: tokenColor("color/text/on-brand"),
  canvas: tokenColor("color/bg/canvas"),
  raised: tokenColor("color/surface/raised"),
  border: tokenColor("color/border/subtle"),
  text: tokenColor("color/text/primary"),
  secondary: tokenColor("color/text/secondary"),
  highlight: tokenColor("color/text/highlight"),
};

const STATUS_TOKEN: Record<Status, string> = {
  aksesibel: "accessible",
  sebagian: "partial",
  tidak_aksesibel: "inaccessible",
  belum_diketahui: "unknown",
};

function GlyphSvg({ icon, size, color, strokeWidth = 2 }: { icon: Glyph; size: number; color: string; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      {icon.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

/** Tanda dan wordmark, sama dengan logo di header. Di latar ungu, tanda diberi tepi putih supaya kotaknya terlihat. */
function Brand({ name, inverse = false }: { name: string; inverse?: boolean }) {
  const size = mark.viewBox;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
      <svg width={64} height={64} viewBox={`0 0 ${size} ${size}`}>
        <rect width={size} height={size} rx={mark.cornerRadius} fill={inverse ? C.onBrand : C.brand} />
        {inverse && <rect x={24} y={24} width={size - 48} height={size - 48} rx={mark.cornerRadius - 24} fill={C.brand} />}
        <path d={mark.pin} fill={C.onBrand} />
        <path d={mark.door} fill={C.brand} />
        <path d={mark.leaf} fill={C.highlight} />
      </svg>
      <div style={{ fontSize: 40, letterSpacing: -1, color: inverse ? C.onBrand : C.text }}>{name}</div>
    </div>
  );
}

type SiteCardProps = {
  siteName: string;
  eyebrow: string;
  lead: string;
  accent: string;
  facilities: string[];
  host: string;
};

/** Kartu bawaan situs: judul hero Beranda dan empat fasilitas yang dicatat. */
export function SiteCard({ siteName, eyebrow, lead, accent, facilities, host }: SiteCardProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        width: "100%",
        height: "100%",
        padding: 72,
        background: C.brand,
        color: C.onBrand,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Brand name={siteName} inverse />
        <div style={{ fontSize: 28 }}>{host}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ fontSize: 32, color: C.highlight }}>{eyebrow}</div>
        {/* Satori membungkus per elemen, jadi setiap kata menjadi satu elemen supaya aksen bisa berbagi baris. */}
        <div style={{ display: "flex", flexWrap: "wrap", columnGap: 22, fontSize: 84, lineHeight: 1.05, letterSpacing: -3 }}>
          {lead.split(" ").map((word, index) => (
            <span key={index}>{word}</span>
          ))}
          <span style={{ color: C.highlight }}>{accent}</span>
        </div>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
        {facilities.map((facility) => (
          <div key={facility} style={{ display: "flex", padding: "12px 24px", borderRadius: 999, background: C.raised, color: C.text, fontSize: 28 }}>
            {facility}
          </div>
        ))}
      </div>
    </div>
  );
}

type PlaceCardProps = {
  siteName: string;
  host: string;
  name: string;
  /** Mis. "Halte · Kecamatan Bogor Tengah". */
  place: string;
  status: Status;
  statusLabel: string;
  /** Ringkasan fasilitas dan tanggal verifikasi, sama dengan teks di halaman lokasi. */
  facts: string[];
};

/** Ukuran nama tempat mengecil untuk nama panjang supaya tetap muat dalam tiga baris. */
export function nameSize(name: string) {
  if (name.length > 70) return 52;
  if (name.length > 40) return 64;
  return 76;
}

/** Kartu Detail lokasi: nama, kategori dan kecamatan, status (teks + ikon + warna), ringkasan, dan tanggal verifikasi. */
export function PlaceCard({ siteName, host, name, place, status, statusLabel, facts }: PlaceCardProps) {
  const tone = STATUS_TOKEN[status];
  const fg = tokenColor(`color/status/${tone}/fg`);
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        width: "100%",
        height: "100%",
        padding: 72,
        background: C.canvas,
        color: C.text,
        borderBottom: `20px solid ${C.brand}`,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Brand name={siteName} />
        <div style={{ fontSize: 28, color: C.secondary }}>{host}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
        <div style={{ fontSize: 32, color: C.secondary }}>{place}</div>
        <div
          style={{
            display: "block",
            fontSize: nameSize(name),
            lineHeight: 1.08,
            letterSpacing: -2,
            lineClamp: 3,
            overflow: "hidden",
          }}
        >
          {name}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 26px 12px 20px",
            borderRadius: 999,
            background: tokenColor(`color/status/${tone}/bg`),
            color: fg,
            fontSize: 34,
          }}
        >
          <GlyphSvg icon={STATUS_ICON[status]} size={38} color={fg} strokeWidth={2.25} />
          {statusLabel}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 28, color: C.secondary }}>
          {facts.map((fact) => (
            <div key={fact}>{fact}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
