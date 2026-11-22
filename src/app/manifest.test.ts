import { createTranslator } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import messages from "../../messages/id.json";
import manifest from "./manifest";

vi.mock("next-intl/server", () => ({
  getTranslations: async (namespace: string) => createTranslator({ locale: "id", messages, namespace: namespace as "Metadata" }),
}));

describe("manifest", () => {
  it("names the app in Indonesian, uses the brand colours from the tokens and lists the icons", async () => {
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
      icons: [
        { src: "/ikon/ikon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
        { src: "/ikon/ikon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
        { src: "/ikon/ikon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      ],
    });
  });
});
