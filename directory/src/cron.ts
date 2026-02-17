import { initDb } from "./db.js";
import { startSnapshotCapture } from "./snapshot.js";

async function main() {
  await initDb();
  startSnapshotCapture();

  console.log("[reef-cron] Snapshot capture running");
}

main().catch((err) => {
  console.error("[reef-cron] Fatal:", err);
  process.exit(1);
});
