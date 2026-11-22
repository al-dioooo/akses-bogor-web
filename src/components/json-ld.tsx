import { serializeJsonLd } from "@/lib/json-ld";

/** Data terstruktur schema.org di halaman (issue #114). Tidak terlihat dan tidak dibacakan pembaca layar. */
export function JsonLd({ data }: { data: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }} />;
}
