import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WithIntl } from "@/test/intl";
import { GoogleSignIn } from "./google-sign-in";

const signInGoogle = vi.hoisted(() => vi.fn());
vi.mock("@/app/masuk/actions", () => ({ signInGoogle }));

// next/script diganti: `scriptLoads` menentukan apakah onReady atau onError yang dipanggil.
let scriptLoads = true;
vi.mock("next/script", async () => {
  const { useEffect } = await import("react");
  return {
    default: function Script({ onReady, onError }: { onReady?: () => void; onError?: () => void }) {
      useEffect(() => {
        if (scriptLoads) onReady?.();
        else onError?.();
      }, [onReady, onError]);
      return null;
    },
  };
});

type Options = Record<string, unknown> & { callback?: (response: { credential?: string }) => void };

function fakeGoogle() {
  const calls: { init?: Options; button?: Options } = {};
  window.google = {
    accounts: {
      id: {
        initialize: (options: Options) => {
          calls.init = options;
        },
        renderButton: (_parent: HTMLElement, options: Options) => {
          calls.button = options;
        },
      },
    },
  };
  return calls;
}

afterEach(() => {
  delete window.google;
  scriptLoads = true;
  signInGoogle.mockReset();
});

describe("GoogleSignIn", () => {
  it("renders the Google button in Indonesian for this client and sends the credential with the return path", async () => {
    vi.stubGlobal("matchMedia", () => ({ matches: false }));
    const google = fakeGoogle();
    signInGoogle.mockResolvedValue({ error: { message: "Masuk dengan Google gagal." } });
    render(<GoogleSignIn clientId="client-tes" kembali="/laporkan" />, { wrapper: WithIntl });

    expect(google.init).toMatchObject({ client_id: "client-tes", ux_mode: "popup" });
    expect(google.button).toMatchObject({ locale: "id", theme: "outline", text: "signin_with" });

    await act(async () => {
      google.init!.callback!({ credential: "token-google" });
    });
    expect(signInGoogle).toHaveBeenCalledWith("token-google", "/laporkan");
    expect(screen.getByRole("alert").textContent).toBe("Masuk dengan Google gagal.");
    vi.unstubAllGlobals();
  });

  it("points to the email code when the Google script cannot load", () => {
    scriptLoads = false;
    render(<GoogleSignIn clientId="client-tes" kembali={null} />, { wrapper: WithIntl });
    expect(screen.getByText("Tombol Google tidak bisa dimuat. Masuk dengan kode email di bawah.")).toBeTruthy();
  });
});
