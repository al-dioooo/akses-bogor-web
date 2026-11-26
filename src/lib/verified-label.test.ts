import { createFormatter, createTranslator } from "next-intl";
import { describe, expect, it } from "vitest";
import messages from "../../messages/id.json";
import { imageMonth, verifiedLabel } from "./verified-label";

const format = createFormatter({ locale: "id", timeZone: "Asia/Jakarta" });
const card = createTranslator({ locale: "id", messages, namespace: "Lokasi" });
const detail = createTranslator({ locale: "id", messages, namespace: "Detail" });
const PLACE = { lastVerifiedAt: "2026-11-03T03:00:00.000Z" };

describe("verifiedLabel", () => {
  it("gives a street view place the plain team label with the image month as its date (ADR-0058)", () => {
    const place = { lastVerifiedAt: "2026-01-01T00:00:00.000Z", verificationSource: "street_view" as const, streetViewImageDate: "2026-01" };
    const label = verifiedLabel(place, format, "long");
    expect(detail(label.key, label.values)).toBe("Terakhir diverifikasi 1 Januari 2026");
    const cards = createTranslator({ locale: "id", messages, namespace: "Agen.kartu" });
    expect(cards(label.key, label.values)).toBe("Terakhir diverifikasi 1 Januari 2026");
  });

  it("keeps the team and admin labels", () => {
    const team = verifiedLabel(PLACE, format, "long");
    expect(detail(team.key, team.values)).toBe("Terakhir diverifikasi 3 November 2026");
    const admin = verifiedLabel({ ...PLACE, verifiedBy: "admin" }, format, "medium");
    expect(card(admin.key, admin.values)).toMatch(/^Diterbitkan langsung oleh admin · /);
  });

  it("formats the image month in Indonesian for Kelola tempat", () => {
    expect(imageMonth("2025-12", format)).toBe("Desember 2025");
    expect(imageMonth("Jan 2026", format)).toBe("");
    expect(imageMonth(null, format)).toBe("");
  });
});
