import { Agent, createUser, createSigner } from "@xmtp/agent-sdk";
import * as path from "node:path";
import {
  getConfigDir,
  loadWalletKey,
  getOrCreateIdentity,
  loadEncryptionKey,
} from "./identity.js";
import type { Hex } from "viem";

/**
 * Create and initialize a Reef XMTP agent.
 * Loads identity from config directory, creates XMTP signer, and initializes the agent.
 */
export async function createReefAgent(configDir?: string): Promise<Agent> {
  const dir = configDir || getConfigDir();

  // Ensure identity exists
  const identity = getOrCreateIdentity(dir);

  // Load wallet key
  const walletKey = loadWalletKey(dir);
  if (!walletKey) {
    throw new Error(
      "Wallet key not found. Run 'reef identity' to generate a new identity.",
    );
  }

  // Create XMTP user from saved key
  const user = createUser(walletKey as Hex);
  const signer = createSigner(user);

  // Load encryption key
  const encryptionKey = loadEncryptionKey(dir);

  // Set env vars for XMTP if encryption key exists
  if (encryptionKey) {
    process.env.XMTP_DB_ENCRYPTION_KEY = encryptionKey;
  }

  const env = (identity.xmtpEnv as "dev" | "production") || "dev";

  const agent = await Agent.create(signer, {
    env,
    dbPath: path.join(dir, "xmtp.db"),
  });

  return agent;
}
