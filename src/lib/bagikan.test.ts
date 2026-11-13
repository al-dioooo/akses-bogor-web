import { describe, expect, it, vi } from "vitest";
import { placeUrl, shareLink } from "./bagikan";

const DATA = { title: "Kampus contoh B", url: "https://akses-bogor.vercel.app/lokasi/b3e865a0" };

function abort() {
  return Object.assign(new Error("Share canceled"), { name: "AbortError" });
}

describe("placeUrl", () => {
  it("keeps only the origin and the place path", () => {
    expect(placeUrl("https://akses-bogor.vercel.app", "b3e865a0")).toBe("https://akses-bogor.vercel.app/lokasi/b3e865a0");
  });
});

describe("shareLink", () => {
  it("uses the device share sheet when there is one, without copying", async () => {
    const share = vi.fn(async () => {});
    const writeText = vi.fn(async () => {});
    expect(await shareLink(DATA, { share, clipboard: { writeText } })).toBe("shared");
    expect(share).toHaveBeenCalledWith({ title: DATA.title, url: DATA.url });
    expect(writeText).not.toHaveBeenCalled();
  });

  it("does nothing more when the person closes the share sheet", async () => {
    const writeText = vi.fn(async () => {});
    const share = vi.fn(async () => {
      throw abort();
    });
    expect(await shareLink(DATA, { share, clipboard: { writeText } })).toBe("cancelled");
    expect(writeText).not.toHaveBeenCalled();
  });

  it("copies the link when the share sheet fails for another reason", async () => {
    const writeText = vi.fn(async () => {});
    const share = vi.fn(async () => {
      throw Object.assign(new Error("Not allowed"), { name: "NotAllowedError" });
    });
    expect(await shareLink(DATA, { share, clipboard: { writeText } })).toBe("copied");
    expect(writeText).toHaveBeenCalledWith(DATA.url);
  });

  it("copies the link when the browser cannot share this data", async () => {
    const share = vi.fn(async () => {});
    const writeText = vi.fn(async () => {});
    expect(await shareLink(DATA, { share, canShare: () => false, clipboard: { writeText } })).toBe("copied");
    expect(share).not.toHaveBeenCalled();
  });

  it("copies the link when there is no share sheet", async () => {
    const writeText = vi.fn(async () => {});
    expect(await shareLink(DATA, { clipboard: { writeText } })).toBe("copied");
    expect(writeText).toHaveBeenCalledWith(DATA.url);
  });

  it("fails when copying is refused", async () => {
    const writeText = vi.fn(async () => {
      throw new Error("Denied");
    });
    expect(await shareLink(DATA, { clipboard: { writeText } })).toBe("failed");
  });

  it("fails when there is neither a share sheet nor a clipboard", async () => {
    expect(await shareLink(DATA, {})).toBe("failed");
  });
});
