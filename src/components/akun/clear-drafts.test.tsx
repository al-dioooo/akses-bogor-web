import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ClearDrafts, SignOutForm } from "./clear-drafts";

const calls: string[] = [];
vi.mock("@/lib/draf", () => ({ clearAllDrafts: vi.fn(async () => void calls.push("draf")) }));
vi.mock("@/app/akun/actions", () => ({ signOut: vi.fn(async () => void calls.push("keluar")) }));

describe("drafts on shared devices (ADR-0033)", () => {
  it("clears the drafts before signing out", async () => {
    calls.length = 0;
    render(
      <SignOutForm>
        <button>Keluar</button>
      </SignOutForm>,
    );
    await userEvent.setup().click(screen.getByRole("button", { name: "Keluar" }));
    await waitFor(() => expect(calls).toEqual(["draf", "keluar"]));
  });

  it("clears the drafts once the account is deleted", async () => {
    calls.length = 0;
    render(<ClearDrafts />);
    await waitFor(() => expect(calls).toEqual(["draf"]));
  });
});
