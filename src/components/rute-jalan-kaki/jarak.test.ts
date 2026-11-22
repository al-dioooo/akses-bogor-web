import { createFormatter } from "next-intl";
import { describe, expect, it } from "vitest";
import { distanceText, walkingMinutes } from "./jarak";

const format = createFormatter({ locale: "id" });

describe("distanceText", () => {
  it("rounds metres to 10 m below a kilometre and uses one decimal above", () => {
    expect(distanceText(format, 7)).toBe("7 m");
    expect(distanceText(format, 352)).toBe("350 m");
    expect(distanceText(format, 1460)).toBe("1,5 km");
  });
});

describe("walkingMinutes", () => {
  it("never says zero minutes", () => {
    expect(walkingMinutes(20)).toBe(1);
    expect(walkingMinutes(254)).toBe(4);
  });
});
