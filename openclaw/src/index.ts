/**
 * Reef Protocol channel plugin for OpenClaw.
 *
 * Bridges the Reef daemon (XMTP) ↔ OpenClaw agent loop by:
 *   - Watching ~/.reef/messages.json for new inbound messages
 *   - Dispatching them into the OpenClaw agent as channel messages
 *   - Auto-sending agent text responses back via the daemon HTTP API
 *
 * Structured app actions (game moves, proposals) are handled by the agent
 * via `reef apps send` bash commands — this plugin only handles text.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import {
  decodeA2AMessage,
  isA2ARequest,
  encodeA2AMessage,
  textPart,
  createMessage,
  createSendMessageRequest,
  extractAppAction,
} from "@reef-protocol/protocol";
import type { InboxMessage } from "@reef-protocol/client/messages";
import { loadMessages } from "@reef-protocol/client/messages";
import { loadIdentity } from "@reef-protocol/client/identity";
import { sendViaDaemon } from "@reef-protocol/client/sender";

// ---------------------------------------------------------------------------
// Message text extraction
// ---------------------------------------------------------------------------

/**
 * Extract human-readable text from a raw A2A message string.
 *
 * - message/send requests → concatenate TextParts, format DataParts as
 *   `[app-action] appId/action: {payload}`
 * - Anything else → return the raw string
 */
function extractText(raw: string): string {
  const decoded = decodeA2AMessage(raw);
  if (!decoded || !isA2ARequest(decoded) || decoded.method !== "message/send") {
    return raw;
  }

  const params = decoded.params as {
    message?: { parts?: Array<Record<string, unknown>> };
  };
  const parts = params?.message?.parts;
  if (!Array.isArray(parts) || parts.length === 0) return raw;

  const segments: string[] = [];

  for (const part of parts) {
    if (part.kind === "text" && typeof part.text === "string") {
      segments.push(part.text);
    } else if (part.kind === "data") {
      const appAction = extractAppAction(
        part as { kind: "data"; data: Record<string, unknown> },
      );
      if (appAction) {
        segments.push(
          `[app-action] ${appAction.appId}/${appAction.action}: ${JSON.stringify(appAction.payload)}`,
        );
      }
    }
  }

  return segments.length > 0 ? segments.join("\n") : raw;
}

// ---------------------------------------------------------------------------
// Plugin definition
// ---------------------------------------------------------------------------

export interface ReefAccountConfig {
  enabled: boolean;
  configDir?: string;
}

interface ReefPluginConfig {
  channels?: {
    reef?: {
      accounts?: Record<string, ReefAccountConfig>;
      dmPolicy?: string;
    };
  };
}

/**
 * Register the Reef channel plugin with OpenClaw.
 *
 * OpenClaw discovers this via the `openclaw.extensions` field in package.json.
 * The function receives the plugin runtime and registers a channel definition.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function register(ocr: any): void {
  ocr.channels.register({
    // --- Identity ----------------------------------------------------------
    id: "reef",
    meta: {
      label: "Reef Protocol",
      selectionLabel: "Reef Protocol (A2A agent messaging)",
      blurb: "Agent-to-agent encrypted messaging over XMTP.",
      order: 80,
      aliases: ["reef", "a2a", "xmtp"],
    },

    // --- Capabilities ------------------------------------------------------
    capabilities: {
      chatTypes: ["direct"],
    },

    // --- Config resolution -------------------------------------------------
    config: {
      listAccountIds(cfg: ReefPluginConfig): string[] {
        const accounts = cfg?.channels?.reef?.accounts;
        if (!accounts) return [];
        return Object.keys(accounts).filter((k) => accounts[k]?.enabled);
      },

      resolveAccount(
        cfg: ReefPluginConfig,
        accountId: string,
      ): ReefAccountConfig | null {
        return cfg?.channels?.reef?.accounts?.[accountId] ?? null;
      },
    },

    // --- Outbound ----------------------------------------------------------
    outbound: {
      /**
       * Send a text response back to a Reef peer.
       *
       * The agent's text reply is pre-encoded as an A2A message/send request
       * and relayed through the running daemon's local HTTP API.
       */
      async sendText({
        to,
        text,
        account,
      }: {
        to: string;
        text: string;
        account: ReefAccountConfig;
      }): Promise<void> {
        const configDir =
          account?.configDir ?? path.join(process.env.HOME || "~", ".reef");

        // Pre-encode as A2A message/send
        const msg = createMessage("user", [textPart(text)]);
        const request = createSendMessageRequest(msg);
        const encoded = encodeA2AMessage(
          request as unknown as Record<string, unknown>,
        );

        const sent = await sendViaDaemon(to, encoded, configDir);
        if (!sent) {
          throw new Error(
            "[reef] Daemon is not running. Start it with: reef start --name <name>",
          );
        }
      },
    },

    // --- Gateway (inbound) -------------------------------------------------
    gateway: {
      /**
       * Start watching for new Reef messages and dispatch them to the agent.
       *
       * Uses fs.watch() on ~/.reef/messages.json for near-instant detection.
       * Returns a { stop } handle to tear down the watcher.
       */
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async startAccount(rt: any, account: ReefAccountConfig) {
        const configDir =
          account?.configDir ?? path.join(process.env.HOME || "~", ".reef");

        const messagesFile = path.join(configDir, "messages.json");

        // Load identity to know our own address (skip self-messages)
        const identity = loadIdentity(configDir);
        if (!identity) {
          console.error(
            "[reef-plugin] No identity found. Run `reef start --name <name>` first.",
          );
          return { stop() {} };
        }
        const selfAddress = identity.address.toLowerCase();

        // Track last seen message ID to detect new arrivals
        const existingMessages = loadMessages(configDir);
        let lastSeenId =
          existingMessages.length > 0
            ? existingMessages[existingMessages.length - 1].id
            : null;

        console.log(
          `[reef-plugin] Watching ${messagesFile} (${existingMessages.length} existing messages)`,
        );

        // Debounce — fs.watch fires multiple times per write
        let debounceTimer: ReturnType<typeof setTimeout> | null = null;

        const processNewMessages = async () => {
          try {
            const messages = loadMessages(configDir);
            if (messages.length === 0) return;

            // Find new messages after lastSeenId
            let startIdx = 0;
            if (lastSeenId) {
              const idx = messages.findIndex(
                (m: InboxMessage) => m.id === lastSeenId,
              );
              startIdx = idx >= 0 ? idx + 1 : 0;
            }

            const newMessages = messages.slice(startIdx);
            if (newMessages.length === 0) return;

            for (const msg of newMessages) {
              // Skip self-messages
              if (msg.from.toLowerCase() === selfAddress) continue;

              const text = extractText(msg.text);
              const senderAddress = msg.from;

              try {
                // Resolve agent route for this peer
                const route = await rt.channel.routing.resolveAgentRoute({
                  peer: { kind: "direct", id: senderAddress },
                });

                if (!route) {
                  console.warn(
                    `[reef-plugin] No route for sender ${senderAddress}`,
                  );
                  continue;
                }

                // Format as inbound envelope
                const envelope = rt.channel.reply.formatInboundEnvelope({
                  text,
                  route,
                  messageId: msg.id,
                  timestamp: msg.timestamp,
                });

                // Finalize context with session key
                const sessionKey = `agent:main:reef:dm:${senderAddress}`;
                const ctx = rt.channel.reply.finalizeInboundContext(envelope, {
                  sessionKey,
                });

                // Dispatch to agent
                await rt.channel.reply.dispatchReplyWithBufferedBlockDispatcher(
                  ctx,
                );
              } catch (err) {
                console.error(
                  `[reef-plugin] Error dispatching message from ${senderAddress}:`,
                  (err as Error).message,
                );
              }
            }

            // Update last seen
            lastSeenId = messages[messages.length - 1].id;
          } catch (err) {
            console.error(
              "[reef-plugin] Error processing messages:",
              (err as Error).message,
            );
          }
        };

        // Watch for file changes
        let watcher: fs.FSWatcher | null = null;

        try {
          // Ensure messages file exists before watching
          if (!fs.existsSync(messagesFile)) {
            fs.mkdirSync(path.dirname(messagesFile), { recursive: true });
            fs.writeFileSync(messagesFile, "[]");
          }

          watcher = fs.watch(messagesFile, () => {
            if (debounceTimer) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(processNewMessages, 200);
          });

          watcher.on("error", (err) => {
            console.error("[reef-plugin] Watcher error:", err.message);
          });
        } catch (err) {
          console.error(
            "[reef-plugin] Failed to start file watcher:",
            (err as Error).message,
          );
        }

        console.log(`[reef-plugin] Channel active for ${identity.address}`);

        return {
          stop() {
            if (debounceTimer) clearTimeout(debounceTimer);
            if (watcher) {
              watcher.close();
              watcher = null;
            }
            console.log("[reef-plugin] Channel stopped");
          },
        };
      },
    },
  });
}
