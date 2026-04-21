import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

/**
 * Lightweight "e2e" — the closest we can get to Playwright without
 * downloading Chromium or booting a dev server.
 *
 * What this test does that the unit test in GetNumber.test.tsx does NOT:
 *   • Uses the REAL `src/lib/api.ts` (no `vi.mock("@/lib/api")`).
 *   • Mocks only the global `fetch` so requests go through the real
 *     `request()` wrapper, the real ApiError construction, and the
 *     real auth-header logic.
 *   • Simulates the full admin-toggles-MSI-off scenario by changing
 *     what the fetch handler returns mid-test, then dispatching the
 *     same `focus` event the browser would fire when the agent comes
 *     back to the tab.
 *
 * This catches contract drift between backend `code: 'PROVIDER_DISABLED'`
 * and the frontend's `ApiError.code === 'PROVIDER_DISABLED'` branch —
 * which a unit test with a hand-built ApiError can't catch.
 */

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { per_request_limit: 15, daily_limit: 100 },
    maintenanceMode: false,
    maintenanceMessage: "",
  }),
}));

const toastSpy = vi.fn();
vi.mock("@/hooks/use-toast", () => ({
  toast: (args: unknown) => toastSpy(args),
}));

// Mutable fetch state so individual tests can flip the backend's mood
// without re-rendering the component.
const backend = {
  msiEnabled: true,
  imsEnabled: false,
  numpanelEnabled: false,
  iprnEnabled: false,
  // Toggle to make /numbers/get reject with PROVIDER_DISABLED
  msiBlockedAtAllocate: false,
};

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function fakeFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === "string" ? input : input.toString();
  const path = url.replace(/^https?:\/\/[^/]+\/api/, "");
  const method = (init?.method || "GET").toUpperCase();

  if (path === "/numbers/providers") {
    const list: { id: string; name: string }[] = [{ id: "acchub", name: "AccHub" }];
    if (backend.msiEnabled) list.push({ id: "msi", name: "MSI SMS" });
    if (backend.imsEnabled) list.push({ id: "ims", name: "IMS SMS" });
    if (backend.numpanelEnabled) list.push({ id: "numpanel", name: "NumPanel" });
    if (backend.iprnEnabled) list.push({ id: "iprn", name: "IPRN Data" });
    return Promise.resolve(jsonResponse(200, { providers: list }));
  }
  if (path === "/numbers/config") {
    return Promise.resolve(jsonResponse(200, { otp_expiry_sec: 480, server_now: Math.floor(Date.now() / 1000) }));
  }
  if (path === "/numbers/my") return Promise.resolve(jsonResponse(200, { numbers: [] }));
  if (path === "/numbers/msi/ranges") return Promise.resolve(jsonResponse(200, { ranges: [{ name: "Peru-Bitel", count: 42 }] }));
  if (path === "/numbers/ims/ranges") return Promise.resolve(jsonResponse(200, { ranges: [] }));
  if (path.startsWith("/numbers/countries/")) return Promise.resolve(jsonResponse(200, { countries: [{ id: 1, name: "Bangladesh" }] }));
  if (path.startsWith("/numbers/operators/")) return Promise.resolve(jsonResponse(200, { operators: [] }));

  if (path === "/numbers/get" && method === "POST") {
    if (backend.msiBlockedAtAllocate) {
      return Promise.resolve(jsonResponse(403, {
        code: "PROVIDER_DISABLED",
        provider: "msi",
        provider_name: "MSI SMS",
        error: "MSI SMS is currently disabled by admin. Please pick another source.",
        allocated: [],
        errors: [],
      }));
    }
    return Promise.resolve(jsonResponse(200, { allocated: [], errors: [] }));
  }

  return Promise.resolve(jsonResponse(200, {}));
}

// eslint-disable-next-line import/first
import AgentGetNumber from "./GetNumber";

beforeEach(() => {
  toastSpy.mockReset();
  backend.msiEnabled = true;
  backend.imsEnabled = false;
  backend.numpanelEnabled = false;
  backend.iprnEnabled = false;
  backend.msiBlockedAtAllocate = false;
  vi.stubGlobal("fetch", vi.fn(fakeFetch));
  Object.assign(navigator, { clipboard: { writeText: vi.fn(() => Promise.resolve()) } });
  (global as unknown as { Notification: undefined }).Notification = undefined;
  localStorage.setItem("nexus_token", "test-token");
});

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe("AgentGetNumber e2e — admin-toggle-off round-trip", () => {
  it("admin disables MSI mid-session → focus event refreshes → Server C disappears + auto-switch to Server A", async () => {
    render(<AgentGetNumber />);
    expect(await screen.findByRole("button", { name: "Server C" })).toBeInTheDocument();

    // Admin flips MSI off in another tab.
    backend.msiEnabled = false;

    await act(async () => { window.dispatchEvent(new Event("focus")); });

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Server C" })).not.toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: "Server A" })).toBeInTheDocument();
  });

  it("agent clicks Get on MSI → backend returns 403 PROVIDER_DISABLED → toast + auto-switch", async () => {
    const user = userEvent.setup();
    render(<AgentGetNumber />);

    await user.click(await screen.findByRole("button", { name: "Server C" }));
    await user.click(await screen.findByRole("button", { name: /select a range/i }));
    await user.click(await screen.findByText("Peru-Bitel"));

    // Admin disables MSI between picker-render and click. Both the
    // pre-flight refresh AND the actual /numbers/get will reflect it.
    backend.msiEnabled = false;
    backend.msiBlockedAtAllocate = true;

    await user.click(screen.getByRole("button", { name: /get number/i }));

    await waitFor(() => {
      const titles = toastSpy.mock.calls.map((c) => (c[0] as { title?: string })?.title);
      const matched = titles.some((t) => t === "Source disabled by admin" || t === "Provider disabled mid-session");
      expect(matched).toBe(true);
    });

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Server C" })).not.toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: "Server A" })).toBeInTheDocument();
  });

  it("each togglable provider (ims/msi/numpanel/iprn) hides from the picker when its enabled flag is false", async () => {
    backend.msiEnabled = true;
    backend.imsEnabled = true;
    backend.numpanelEnabled = true;
    backend.iprnEnabled = true;
    const { unmount } = render(<AgentGetNumber />);
    for (const label of ["Server A", "Server B", "Server C", "Server D", "Server E"]) {
      expect(await screen.findByRole("button", { name: label })).toBeInTheDocument();
    }
    unmount();

    backend.msiEnabled = false;
    backend.imsEnabled = false;
    backend.numpanelEnabled = false;
    backend.iprnEnabled = false;
    render(<AgentGetNumber />);
    expect(await screen.findByRole("button", { name: "Server A" })).toBeInTheDocument();
    for (const label of ["Server B", "Server C", "Server D", "Server E"]) {
      expect(screen.queryByRole("button", { name: label })).not.toBeInTheDocument();
    }
  });
});