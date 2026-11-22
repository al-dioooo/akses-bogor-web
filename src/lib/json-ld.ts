import type { Facility, PlaceDetail } from "@/lib/api";

/**
 * Data terstruktur schema.org (JSON-LD) untuk halaman publik (issue #114). Hanya fakta yang tampil di halaman yang
 * dimasukkan; tidak ada rating, ulasan, atau klaim aksesibilitas di luar jawaban yang sudah diverifikasi.
 */

/** Wilayah semua tempat di AksesBogor. Nama resmi, bukan teks antarmuka. */
const CITY = { "@type": "City", name: "Kota Bogor" } as const;
const ADDRESS = { "@type": "PostalAddress", addressLocality: "Kota Bogor", addressRegion: "Jawa Barat", addressCountry: "ID" } as const;

type Site = { url: string; name: string; description: string };

/** `WebSite` dengan pencarian ke Jelajahi, dan `Organization` penerbitnya, untuk Beranda. */
export function siteJsonLd({ url, name, description }: Site) {
  const home = new URL("/", url).href;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${home}#situs`,
        url: home,
        name,
        description,
        inLanguage: "id-ID",
        publisher: { "@id": `${home}#organisasi` },
        potentialAction: {
          "@type": "SearchAction",
          target: { "@type": "EntryPoint", urlTemplate: `${new URL("/jelajahi", url).href}?q={search_term_string}` },
          "query-input": "required name=search_term_string",
        },
      },
      { "@type": "Organization", "@id": `${home}#organisasi`, name, url: home, areaServed: CITY },
    ],
  };
}

type PlaceLabels = {
  url: string;
  description: string;
  /** Nama fasilitas seperti di halaman, mis. "Ramp / Jalur Landai". */
  facility: (facility: Facility) => string;
};

/**
 * `Place` untuk Detail lokasi: nama, alamat tingkat kota, kecamatan, dan koordinat. Fasilitas masuk sebagai
 * `amenityFeature` hanya bila jawabannya pasti: Tersedia (`true`, artinya bisa dipakai, ADR-0022) atau Tidak tersedia
 * (`false`). Jawaban Tidak perlu dan Belum tahu tidak dimasukkan.
 */
export function placeJsonLd(place: PlaceDetail, { url, description, facility }: PlaceLabels) {
  const features = place.facilities
    .filter(({ answer }) => answer === "tersedia" || answer === "tidak_tersedia")
    .map(({ facility: key, answer }) => ({ "@type": "LocationFeatureSpecification", name: facility(key), value: answer === "tersedia" }));
  return {
    "@context": "https://schema.org",
    "@type": "Place",
    "@id": `${url}#tempat`,
    name: place.name,
    url,
    description,
    address: ADDRESS,
    containedInPlace: { "@type": "AdministrativeArea", name: `Kecamatan ${place.district.name}`, containedInPlace: CITY },
    geo: { "@type": "GeoCoordinates", latitude: place.location.lat, longitude: place.location.lng },
    ...(features.length > 0 ? { amenityFeature: features } : {}),
  };
}

/** Isi `<script type="application/ld+json">`. `<` diganti supaya teks dari data tidak bisa menutup tag script. */
export function serializeJsonLd(data: object) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
