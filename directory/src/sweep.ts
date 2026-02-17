import { Op } from "sequelize";
import { Agent } from "./models/Agent.js";
import { config } from "./config.js";

/**
 * Mark agents as offline if their last heartbeat is older than the threshold.
 */
async function sweepStaleAgents(): Promise<void> {
  const cutoff = new Date(
    Date.now() - config.offlineThresholdMinutes * 60 * 1000,
  );

  const [count] = await Agent.update(
    { availability: "offline" },
    {
      where: {
        availability: "online",
        last_heartbeat: { [Op.lt]: cutoff },
      },
    },
  );

  if (count > 0) {
    console.log(`[sweep] Marked ${count} agent(s) as offline`);
  }
}

/**
 * Start the periodic stale-agent sweep.
 */
export function startSweep(): NodeJS.Timeout {
  return setInterval(sweepStaleAgents, config.sweepIntervalMs);
}
