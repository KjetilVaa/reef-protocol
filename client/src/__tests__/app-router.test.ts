import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { AppRouter } from "../app-router.js";
import type { Message } from "@a2a-js/sdk";
import {
  buildAppManifest,
  buildAppAction,
  buildAppActionDataPart,
  textPart,
} from "@reef-protocol/protocol";
import { installWellKnownApps } from "../app-store.js";

const testManifest = buildAppManifest("chess", "Chess", "A chess game", [
  buildAppAction("move", "Move", "Make a move"),
]);

function makeMessage(parts: Message["parts"]): Message {
  return { kind: "message", messageId: "msg-1", role: "user", parts };
}

describe("AppRouter", () => {
  it("registers and retrieves an app manifest", () => {
    const router = new AppRouter();
    router.register("chess", testManifest);
    expect(router.get("chess")).toBe(testManifest);
    expect(router.listApps()).toEqual(["chess"]);
  });

  it("unregisters an app", () => {
    const router = new AppRouter();
    router.register("chess", testManifest);
    expect(router.unregister("chess")).toBe(true);
    expect(router.get("chess")).toBeUndefined();
    expect(router.unregister("chess")).toBe(false);
  });

  it("returns null for text-only messages", () => {
    const router = new AppRouter();
    router.register("chess", testManifest);
    const result = router.route(makeMessage([textPart("Hello")]), "0xPeer");
    expect(result).toBeNull();
  });

  it("returns null for DataParts without appId", () => {
    const router = new AppRouter();
    router.register("chess", testManifest);
    const msg = makeMessage([{ kind: "data", data: { someKey: "value" } }]);
    const result = router.route(msg, "0xPeer");
    expect(result).toBeNull();
  });
});

describe("AppRouter.route", () => {
  it("logs and acknowledges known app actions", () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const router = new AppRouter();
    router.register("chess", testManifest);

    const msg = makeMessage([
      buildAppActionDataPart("chess", "move", { from: "e2", to: "e4" }),
    ]);
    const result = router.route(msg, "0xPeer");

    expect(result).not.toBeNull();
    const task = result!.result;
    expect(task.kind).toBe("task");
    expect(task.status.state).toBe("working");
    expect(result!.appAction.appId).toBe("chess");
    expect(result!.appAction.action).toBe("move");
    expect(result!.appAction.payload).toEqual({ from: "e2", to: "e4" });

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("[reef:app:chess] from 0xPeer: move"),
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.not.stringContaining("(unknown app)"),
    );

    consoleSpy.mockRestore();
  });

  it("logs unknown app actions with hint", () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const router = new AppRouter();
    // No app registered — "poker" is unknown

    const msg = makeMessage([
      buildAppActionDataPart("poker", "bet", { amount: 100 }),
    ]);
    const result = router.route(msg, "0xPeer");

    expect(result).not.toBeNull();
    expect(result!.result.status.state).toBe("working");
    expect(result!.appAction.appId).toBe("poker");

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        "[reef:app:poker] (unknown app) from 0xPeer: bet",
      ),
    );

    consoleSpy.mockRestore();
  });

  it("returns null for non-app DataParts", () => {
    const router = new AppRouter();
    const msg = makeMessage([
      { kind: "data", data: { type: "file", content: "hello" } },
    ]);
    const result = router.route(msg, "0xPeer");
    expect(result).toBeNull();
  });
});

describe("AppRouter.autoLoadDefaults", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "reef-router-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("returns empty list when no apps are installed", () => {
    const router = new AppRouter();
    const loaded = router.autoLoadDefaults(tmpDir);
    expect(loaded).toEqual([]);
  });

  it("loads apps from markdown files", () => {
    installWellKnownApps(tmpDir);
    const router = new AppRouter();
    const loaded = router.autoLoadDefaults(tmpDir);

    expect(loaded).toContain("tic-tac-toe");
    expect(router.get("tic-tac-toe")).toBeDefined();
    expect(router.get("tic-tac-toe")!.appId).toBe("tic-tac-toe");
  });

  it("auto-loaded apps are routed with logging", () => {
    installWellKnownApps(tmpDir);
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const router = new AppRouter();
    router.autoLoadDefaults(tmpDir);

    const msg = makeMessage([
      buildAppActionDataPart("tic-tac-toe", "move", { position: 4 }),
    ]);
    const result = router.route(msg, "0xPeer");

    expect(result).not.toBeNull();
    expect(result!.result.status.state).toBe("working");
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("[reef:app:tic-tac-toe] from 0xPeer: move"),
    );

    consoleSpy.mockRestore();
  });
});
