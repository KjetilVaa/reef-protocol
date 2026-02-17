import "dotenv/config";

export const config = {
  port: parseInt(process.env.PORT || "3000", 10),
  databaseUrl:
    process.env.DATABASE_URL || "postgres://reef:reef@localhost:5432/reef",
  nodeEnv: process.env.NODE_ENV || "development",
  /** Minutes before an agent is considered offline */
  offlineThresholdMinutes: 20,
  /** Sweep interval in milliseconds (5 min) */
  sweepIntervalMs: 5 * 60 * 1000,
  /** Snapshot capture interval in milliseconds (10 min) */
  snapshotIntervalMs: 10 * 60 * 1000,
};
