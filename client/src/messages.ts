import * as fs from "node:fs";
import * as path from "node:path";
import { getConfigDir } from "./identity.js";

const MAX_MESSAGES = 1000;
const DEDUP_WINDOW_MS = 30_000;

export interface InboxMessage {
  id: string;
  from: string;
  text: string;
  method?: string;
  timestamp: string;
}

function messagesPath(configDir: string): string {
  return path.join(configDir, "messages.json");
}

/**
 * Load all inbox messages from the config directory.
 */
export function loadMessages(configDir?: string): InboxMessage[] {
  const dir = configDir || getConfigDir();
  const filePath = messagesPath(dir);

  if (!fs.existsSync(filePath)) {
    return [];
  }

  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as InboxMessage[];
}

/**
 * Append a message to the inbox. Caps at MAX_MESSAGES, dropping oldest.
 */
export function appendMessage(msg: InboxMessage, configDir?: string): void {
  const dir = configDir || getConfigDir();

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const messages = loadMessages(dir);
  if (messages.some((m) => m.id === msg.id)) return; // dedup by message ID

  // Content-hash dedup: skip if same from+text within time window
  const now = new Date(msg.timestamp).getTime();
  const isDuplicate = messages.some((m) => {
    if (m.from !== msg.from || m.text !== msg.text) return false;
    const age = now - new Date(m.timestamp).getTime();
    return age >= 0 && age < DEDUP_WINDOW_MS;
  });
  if (isDuplicate) return;

  messages.push(msg);

  // Drop oldest if over cap
  const trimmed =
    messages.length > MAX_MESSAGES
      ? messages.slice(messages.length - MAX_MESSAGES)
      : messages;

  fs.writeFileSync(messagesPath(dir), JSON.stringify(trimmed, null, 2));
}

/**
 * Clear all inbox messages.
 */
export function clearMessages(configDir?: string): void {
  const dir = configDir || getConfigDir();

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(messagesPath(dir), JSON.stringify([], null, 2));
}
