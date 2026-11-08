import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WithIntl } from "@/test/intl";
import { LocationPicker } from "./location-picker";

const HALTE = { id: "22222222-2222-4222-8222-222222222222", name: "Halte contoh", category: "halte", status: "sebagian", district: { slug: "bogor-tengah", name: "Bogor Tengah" }, location: { lat: -6.5958, lng: 106.7942 } };
const SEARCH = { places: [HALTE], results: [{ name: "Stasiun Bogor", address: "Jl. Nyi Raja Permas, Kota Bogor", location: { lat: -6.5953, lng: 106.7905 }, kind: "poi" }] };

let answers: Record<string, () => Response>;
const requests: { url: string; body: unknown }[] = [];

beforeEach(() => {
  requests.length = 0;
  answers = {
    "/laporkan/cari": () => Response.json(SEARCH),
    "/laporkan/cek-lokasi": () => Response.json({ district: { slug: "bogor-tengah", name: "Bogor Tengah" }, nearby: [] }),
  };
  vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
    requests.push({ url, body: JSON.parse(String(init.body)) });
    return answers[url]!();
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function setup(props: Partial<Parameters<typeof LocationPicker>[0]> = {}) {
  const onConfirm = vi.fn();
  const onNearbyPending = vi.fn();
  render(<LocationPicker confirmed={null} name="Halte contoh" placeId={null} onConfirm={onConfirm} onNearbyPending={onNearbyPending} {...props} />, { wrapper: WithIntl });
  return { onConfirm, onNearbyPending, user: userEvent.setup() };
}

describe("LocationPicker", () => {
  it("finds a place with the keyboard and announces the moved point", async () => {
    const { user } = setup();
    const search = screen.getByRole("combobox", { name: "Cari nama tempat atau alamat" });
    await user.type(search, "stasiun{Enter}");
    expect(await screen.findByText("2 hasil untuk “stasiun”. Pilih dengan tombol panah atau ketuk hasilnya.")).toBeTruthy();
    expect(search.getAttribute("aria-expanded")).toBe("true");
    await user.keyboard("{ArrowDown}{ArrowDown}");
    const active = screen.getByRole("option", { name: /Stasiun Bogor/ });
    expect(search.getAttribute("aria-activedescendant")).toBe(active.id);
    await user.keyboard("{Enter}");
    expect(search.getAttribute("aria-expanded")).toBe("false");
    expect(screen.getByText("Titik dipindah ke Stasiun Bogor. Periksa titiknya, lalu tekan Pakai lokasi ini.")).toBeTruthy();
    expect(screen.getByText("Dari pencarian: Stasiun Bogor")).toBeTruthy();
    expect(requests[0]).toEqual({ url: "/laporkan/cari", body: { q: "stasiun" } });
  });

  it("points to Laporkan kekurangan when the picked place already exists (FR-23)", async () => {
    const { user } = setup();
    await user.type(screen.getByRole("combobox"), "halte{Enter}");
    await screen.findByRole("option", { name: /Halte contoh, Bogor Tengah \(sudah ada di AksesBogor\)/ });
    await user.keyboard("{ArrowDown}{Enter}");
    expect(screen.getByRole("link", { name: "Laporkan kekurangan di Halte contoh" }).getAttribute("href")).toBe(`/laporkan?lokasi=${HALTE.id}&jenis=kekurangan`);
  });

  it("confirms the point after the kecamatan check", async () => {
    const { user, onConfirm } = setup();
    await user.type(screen.getByRole("combobox"), "stasiun{Enter}");
    await screen.findAllByRole("option");
    await user.keyboard("{ArrowDown}{ArrowDown}{Enter}");
    await user.click(screen.getByRole("button", { name: "Pakai lokasi ini" }));
    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith({ point: { lat: -6.5953, lng: 106.7905 }, district: { slug: "bogor-tengah", name: "Bogor Tengah" } }));
    expect(requests.at(-1)).toEqual({ url: "/laporkan/cek-lokasi", body: { location: { lat: -6.5953, lng: 106.7905 }, name: "Halte contoh" } });
    expect(screen.getByText("Lokasi dipakai: Kecamatan Bogor Tengah.")).toBeTruthy();
  });

  it("explains the coverage when the point is outside Kota Bogor (FR-22)", async () => {
    answers["/laporkan/cek-lokasi"] = () => Response.json({ galat: "di_luar_kota_bogor", pesan: "Titik ini berada di luar Kota Bogor." }, { status: 422 });
    const { user, onConfirm } = setup();
    await user.type(screen.getByRole("combobox"), "stasiun{Enter}");
    await screen.findAllByRole("option");
    await user.keyboard("{ArrowDown}{Enter}");
    await user.click(screen.getByRole("button", { name: "Pakai lokasi ini" }));
    expect(await screen.findByText("Titik ini berada di luar Kota Bogor.")).toBeTruthy();
    expect(document.getElementById("lokasi")!.getAttribute("aria-describedby")).toContain("lokasi-galat");
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("warns about similar places nearby until the reporter answers", async () => {
    answers["/laporkan/cek-lokasi"] = () => Response.json({ district: HALTE.district, nearby: [{ id: HALTE.id, name: "Halte contoh", category: "halte", status: "sebagian", distanceMeters: 30 }] });
    const { user, onNearbyPending } = setup();
    await user.type(screen.getByRole("combobox"), "stasiun{Enter}");
    await screen.findAllByRole("option");
    await user.keyboard("{ArrowDown}{Enter}");
    await user.click(screen.getByRole("button", { name: "Pakai lokasi ini" }));
    expect(await screen.findByRole("heading", { name: "Mungkin tempat ini sudah ada" })).toBeTruthy();
    expect(screen.getByText("Halte contoh, 30 m dari titik ini")).toBeTruthy();
    await waitFor(() => expect(onNearbyPending).toHaveBeenLastCalledWith(true));
    await user.click(screen.getByRole("button", { name: "Bukan, ini tempat lain" }));
    await waitFor(() => expect(onNearbyPending).toHaveBeenLastCalledWith(false));
  });

  it("explains a refused location permission", async () => {
    vi.stubGlobal("navigator", {
      ...navigator,
      geolocation: { getCurrentPosition: (_ok: unknown, fail: (error: { code: number; PERMISSION_DENIED: number }) => void) => fail({ code: 1, PERMISSION_DENIED: 1 }) },
    });
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "Gunakan lokasi saya" }));
    expect(screen.getByText("Izin lokasi ditolak. Izinkan lokasi di pengaturan browser, atau cari tempatnya.")).toBeTruthy();
  });

  it("uses the device location once and shows its accuracy", async () => {
    vi.stubGlobal("navigator", {
      ...navigator,
      geolocation: { getCurrentPosition: (ok: (position: { coords: object }) => void) => ok({ coords: { latitude: -6.6, longitude: 106.8, accuracy: 12.4 } }) },
    });
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "Gunakan lokasi saya" }));
    expect(screen.getByText("Dari lokasi perangkat, akurasi sekitar 12 m")).toBeTruthy();
  });

  it("shows a confirmed location with a way to change it", async () => {
    const { user } = setup({ confirmed: { point: HALTE.location, district: HALTE.district } });
    expect(screen.getByText("Kecamatan Bogor Tengah · -6,59580, 106,79420")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Ubah lokasi" }));
    expect(screen.getByRole("combobox")).toBeTruthy();
  });
});
