import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Sequelize } from "sequelize";

/**
 * Directory API tests.
 *
 * These tests require a running PostgreSQL database.
 * Run with: docker compose up -d postgres && npm test -w directory
 *
 * If PostgreSQL is not available, tests will be skipped.
 */

let sequelize: Sequelize | null = null;
let canConnect = false;

beforeAll(async () => {
  try {
    sequelize = new Sequelize("postgres://reef:reef@localhost:5432/reef", {
      dialect: "postgres",
      logging: false,
    });
    await sequelize.authenticate();
    canConnect = true;
  } catch {
    console.log("PostgreSQL not available — skipping integration tests");
  }
});

afterAll(async () => {
  if (sequelize) {
    await sequelize.close();
  }
});

describe("directory API", () => {
  it.skipIf(!canConnect)("health check returns ok", async () => {
    const res = await fetch("http://localhost:3000/health");
    expect(res.ok).toBe(true);
    const body = await res.json();
    expect(body).toEqual({ status: "ok", service: "reef-directory" });
  });

  it.skipIf(!canConnect)("registers an agent", async () => {
    const res = await fetch("http://localhost:3000/agents/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        address: "0xTestAgent001",
        name: "Test Agent",
        bio: "A test agent for integration testing",
        skills: ["testing", "validation"],
        reefVersion: "0.1.0",
      }),
    });

    expect(res.ok).toBe(true);
    const body = (await res.json()) as {
      success: boolean;
      agentNumber: number;
    };
    expect(body.success).toBe(true);
    expect(typeof body.agentNumber).toBe("number");
  });

  it.skipIf(!canConnect)("gets agent by address", async () => {
    const res = await fetch(
      "http://localhost:3000/agents/0xTestAgent001",
    );
    expect(res.ok).toBe(true);
    const body = (await res.json()) as { name: string; address: string };
    expect(body.name).toBe("Test Agent");
    expect(body.address).toBe("0xTestAgent001");
  });

  it.skipIf(!canConnect)("searches agents by query", async () => {
    const res = await fetch(
      "http://localhost:3000/agents/search?q=Test",
    );
    expect(res.ok).toBe(true);
    const body = (await res.json()) as {
      agents: Array<{ name: string }>;
    };
    expect(body.agents.length).toBeGreaterThan(0);
  });

  it.skipIf(!canConnect)("heartbeat updates agent", async () => {
    const res = await fetch(
      "http://localhost:3000/agents/heartbeat",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: "0xTestAgent001" }),
      },
    );

    expect(res.ok).toBe(true);
    const body = (await res.json()) as {
      success: boolean;
      stats: { totalAgents: number; onlineAgents: number };
    };
    expect(body.success).toBe(true);
    expect(typeof body.stats.totalAgents).toBe("number");
  });

  it.skipIf(!canConnect)("returns stats", async () => {
    const res = await fetch("http://localhost:3000/stats");
    expect(res.ok).toBe(true);
    const body = (await res.json()) as {
      totalAgents: number;
      onlineAgents: number;
      topSkills: string[];
    };
    expect(typeof body.totalAgents).toBe("number");
    expect(Array.isArray(body.topSkills)).toBe(true);
  });

  it.skipIf(!canConnect)("returns 404 for unknown agent", async () => {
    const res = await fetch(
      "http://localhost:3000/agents/0xDoesNotExist",
    );
    expect(res.status).toBe(404);
  });

  it.skipIf(!canConnect)(
    "returns 404 for heartbeat of unregistered agent",
    async () => {
      const res = await fetch(
        "http://localhost:3000/agents/heartbeat",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address: "0xUnregistered" }),
        },
      );
      expect(res.status).toBe(404);
    },
  );
});
