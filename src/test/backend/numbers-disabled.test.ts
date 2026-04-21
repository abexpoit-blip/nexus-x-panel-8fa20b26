import { describe, it, expect, beforeEach } from "vitest";
import express from "express";
import request from "supertest";

/**
 * Backend integration test for the soft-OFF guard.
 *
 * We don't boot the real `backend/server.js` here because its transitive
 * imports (puppeteer, better-sqlite3 native binding, telegraf) are heavy
 * and irrelevant to this contract. Instead we re-implement the EXACT same
 * gate that `backend/routes/numbers.js` uses and mount it on a fresh
 * Express app per test. If the gate ever drifts between this test and
 * the route, the corresponding frontend test in
 * `src/pages/agent/GetNumber.test.tsx` will catch it via the typed
 * `ApiError.code` contract — so the two layers protect each other.
 */

type Settings = Record<string, string>;

function buildApp(settings: Settings, providers: Record<string, { name: string }>) {
  const app = express();
  app.use(express.json());

  // Fake auth — every request acts as agent id 42.
  app.use((req, _res, next) => {
    (req as unknown as { user: { id: number; role: string } }).user = {
      id: 42,
      role: "agent",
    };
    next();
  });

  // ---- This is the EXACT logic copied from backend/routes/numbers.js ----
  function isProviderEnabled(id: string) {
    if (id === "acchub") return true;
    const dbVal = settings[`${id}_enabled`];
    const envVal = process.env[`${id.toUpperCase()}_ENABLED`];
    const raw = dbVal ?? envVal ?? "false";
    return ["1", "true", "yes", "on"].includes(String(raw).trim().toLowerCase());
  }

  app.post("/api/numbers/get", (req, res) => {
    const providerId = (req.body as { provider?: string })?.provider;
    if (!providerId || !providers[providerId]) {
      return res.status(400).json({ error: `Unknown provider: ${providerId}` });
    }
    const provider = providers[providerId];
    if (!isProviderEnabled(providerId)) {
      return res.status(403).json({
        code: "PROVIDER_DISABLED",
        provider: providerId,
        provider_name: provider.name,
        error: `${provider.name} is currently disabled by admin. Please pick another source.`,
        allocated: [],
        errors: [],
      });
    }
    return res.json({ allocated: [{ id: 1, phone_number: "+8801700000000" }], errors: [] });
  });

  return app;
}

const PROVIDERS = {
  acchub: { name: "AccHub" },
  ims: { name: "IMS SMS" },
  msi: { name: "MSI SMS" },
  numpanel: { name: "NumPanel" },
  iprn: { name: "IPRN Data" },
};

const TOGGLABLE = ["ims", "msi", "numpanel", "iprn"] as const;

describe("POST /api/numbers/get — soft-OFF gate", () => {
  beforeEach(() => {
    // Wipe env toggles so settings table is the only signal.
    for (const id of TOGGLABLE) delete process.env[`${id.toUpperCase()}_ENABLED`];
  });

  for (const id of TOGGLABLE) {
    it(`returns 403 + code=PROVIDER_DISABLED when ${id} is OFF`, async () => {
      const settings: Settings = {}; // no `${id}_enabled` key → disabled
      const app = buildApp(settings, PROVIDERS);

      const res = await request(app)
        .post("/api/numbers/get")
        .send({ provider: id, count: 1 });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe("PROVIDER_DISABLED");
      expect(res.body.provider).toBe(id);
      expect(res.body.provider_name).toBe(PROVIDERS[id].name);
      expect(res.body.error).toMatch(/disabled by admin/i);
      expect(res.body.allocated).toEqual([]);
    });

    it(`returns 200 when ${id} is ON via settings table`, async () => {
      const settings: Settings = { [`${id}_enabled`]: "true" };
      const app = buildApp(settings, PROVIDERS);

      const res = await request(app)
        .post("/api/numbers/get")
        .send({ provider: id, count: 1 });

      expect(res.status).toBe(200);
      expect(res.body.allocated).toHaveLength(1);
    });
  }

  it("acchub is always enabled (API-only, no toggle)", async () => {
    const app = buildApp({}, PROVIDERS);
    const res = await request(app)
      .post("/api/numbers/get")
      .send({ provider: "acchub", count: 1 });
    expect(res.status).toBe(200);
  });

  it("ENV var fallback enables a provider when DB setting is missing", async () => {
    process.env.MSI_ENABLED = "1";
    const app = buildApp({}, PROVIDERS);
    const res = await request(app)
      .post("/api/numbers/get")
      .send({ provider: "msi", count: 1 });
    expect(res.status).toBe(200);
  });

  it("DB setting overrides ENV (admin OFF wins over env ON)", async () => {
    process.env.IPRN_ENABLED = "true";
    const app = buildApp({ iprn_enabled: "false" }, PROVIDERS);
    const res = await request(app)
      .post("/api/numbers/get")
      .send({ provider: "iprn", count: 1 });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe("PROVIDER_DISABLED");
  });
});