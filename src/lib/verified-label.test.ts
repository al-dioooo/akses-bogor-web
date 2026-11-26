import { createFormatter, createTranslator } from "next-intl";
import { describe, expect, it } from "vitest";
import messages from "../../messages/id.json";
import { imageMonth, verifiedLabel } from "./verified-label";

const format = createFormatter({ locale: "id", timeZone: "Asia/Jakarta" });
const card = createTranslator({ locale: "id", messages, namespace: "Lokasi" });
const detail = createTranslator({ locale: "id", messages, namespace: "Detail" });
const PLACE = { lastVerifiedAt: "2026-11-03T03:00:00.000Z" };

describe("verifiedLabel (ADR-0057)", () => {
  it("names Street View and the image month, never a plain Diverifikasi", () => {
    const label = verifiedLabel({ ...PLACE, lastVerifiedAt: "2026-01-01T00:00:00.000Z", verificationSource: "street_view", streetViewImageDate: "2026-01" }, format, "medium");
    expect(card(label.key, label.values)).toBe("Diverifikasi dari Street View · gambar Januari 2026");
    expect(detail(label.key, label.values)).toBe("Diverifikasi dari Street View · gambar Januari 2026");
  });

  it("still names Street View when the month is missing or malformed", () => {
    const label = verifiedLabel({ ...PLACE, verificationSource: "street_view", streetViewImageDate: "Jan 2026" }, format, "medium");
    expect(card(label.key, label.values)).toBe("Diverifikasi dari Street View");
  });

  it("keeps the team and admin labels, and treats an older API without the source as a report", () => {
    const team = verifiedLabel(PLACE, format, "long");
    expect(detail(team.key, team.values)).toBe("Terakhir diverifikasi 3 November 2026");
    const admin = verifiedLabel({ ...PLACE, verifiedBy: "admin", verificationSource: "laporan" }, format, "medium");
    expect(card(admin.key, admin.values)).toMatch(/^Diterbitkan langsung oleh admin · /);
  });

  it("formats the image month in Indonesian", () => {
    expect(imageMonth("2025-12", format)).toBe("Desember 2025");
    expect(imageMonth(null, format)).toBe("");
  });
});
