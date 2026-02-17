import { createReefAgent } from "../agent.js";
import { sendTextMessage } from "../sender.js";
import { getOrCreateIdentity, getConfigDir } from "../identity.js";

export async function sendCommand(
  address: string,
  message: string,
): Promise<void> {
  const configDir = getConfigDir();
  const identity = getOrCreateIdentity(configDir);

  console.log(`Sending message to ${address}...`);

  const agent = await createReefAgent(configDir);
  await sendTextMessage(agent, address, message, identity.address);

  console.log("Message sent.");
  await agent.stop();
}
