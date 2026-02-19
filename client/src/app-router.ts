/** App-aware message routing — extracts app actions, logs them, acknowledges */

import { randomUUID } from "node:crypto";
import type { Message, Task, DataPart } from "@a2a-js/sdk";
import type { AppManifest, AppActionMessage } from "@reef-protocol/protocol";
import { extractAppAction, textPart } from "@reef-protocol/protocol";
import { loadAllInstalledApps } from "./app-store.js";

/**
 * Thin routing layer for app messages.
 *
 * The router does NOT make decisions — it extracts structured app actions
 * from incoming messages, logs them to stdout for the AI agent to reason
 * about, and returns a "working" acknowledgment. The agent reads the logs,
 * reads app rules via `reef apps read`, and decides how to respond.
 */
export class AppRouter {
  private apps = new Map<string, AppManifest>();

  /** Register an installed app */
  register(appId: string, manifest: AppManifest): void {
    this.apps.set(appId, manifest);
  }

  /** Unregister an app */
  unregister(appId: string): boolean {
    return this.apps.delete(appId);
  }

  /** Get a registered app manifest */
  get(appId: string): AppManifest | undefined {
    return this.apps.get(appId);
  }

  /** List all registered app IDs */
  listApps(): string[] {
    return Array.from(this.apps.keys());
  }

  /**
   * Auto-load apps from ~/.reef/apps/ markdown files.
   * Returns the list of loaded app IDs.
   */
  autoLoadDefaults(configDir?: string): string[] {
    let manifests: AppManifest[];
    try {
      manifests = loadAllInstalledApps(configDir);
    } catch {
      manifests = [];
    }

    for (const manifest of manifests) {
      this.register(manifest.appId, manifest);
    }

    return manifests.map((m) => m.appId);
  }

  /**
   * Route an incoming message.
   *
   * Scans for DataParts containing app actions. If found, logs the action
   * to stdout and returns a "working" task as acknowledgment.
   * Returns null if no app action is found in the message.
   *
   * All app actions are routed — including for unknown apps — so the agent
   * always sees incoming proposals and can decide how to respond.
   */
  route(
    message: Message,
    fromAddress: string,
  ): { result: Task; appAction: AppActionMessage } | null {
    for (const part of message.parts) {
      if (part.kind !== "data") continue;

      const appAction = extractAppAction(part as DataPart);
      if (!appAction) continue;

      const known = this.apps.has(appAction.appId);
      const tag = known ? "" : " (unknown app)";
      console.log(
        `[reef:app:${appAction.appId}]${tag} from ${fromAddress}: ${appAction.action} ${JSON.stringify(appAction.payload)}`,
      );

      return {
        result: this.makeTask(
          "working",
          `Received ${appAction.action} for ${appAction.appId}`,
        ),
        appAction,
      };
    }

    return null;
  }

  private makeTask(
    state: "completed" | "failed" | "working",
    statusMessage: string,
  ): Task {
    return {
      kind: "task",
      id: randomUUID(),
      contextId: randomUUID(),
      status: {
        state,
        timestamp: new Date().toISOString(),
        message: {
          kind: "message",
          messageId: randomUUID(),
          role: "agent",
          parts: [textPart(statusMessage)],
        },
      },
    };
  }
}
