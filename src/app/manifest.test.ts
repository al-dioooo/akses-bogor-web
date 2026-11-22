import { createTranslator } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import messages from "../../messages/id.json";
import manifest from "./manifest";

vi.mock("next-intl/server", () => ({
  getTranslations: async (namespace: string) => createTranslator({ locale: "id", messages, namespace: namespace as "Metadata" }),
}));

describe("manifest", () => {
  it("names the app in Indonesian and uses the brand colours from the tokens", async () => {
    expect(await manifest()).toEqual({
      name: "AksesBogor",
      short_name: "AksesBogor",
      description: messages.Metadata.description,
      lang: "id",
      dir: "ltr",
      start_url: "/",
      scope: "/",
      display: "standalone",
      background_color: "#F9F9F7",
      theme_color: "#6440E8",
    });
  });
});
