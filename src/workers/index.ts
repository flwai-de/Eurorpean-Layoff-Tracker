import { createRssFetchWorker } from "./rss-fetch";
import { registerCronJobs } from "@/lib/queue/cron";

async function main() {
  console.log("[workers] Starting worker processes...");

  // Register cron schedules
  await registerCronJobs();
  console.log("[workers] Cron jobs registered");

  // Start workers
  const rssFetchWorker = createRssFetchWorker();
  console.log("[workers] RSS fetch worker started");

  // Graceful shutdown
  const shutdown = async () => {
    console.log("[workers] Shutting down...");
    await rssFetchWorker.close();
    process.exit(0);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

main().catch((err) => {
  console.error("[workers] Fatal error:", err);
  process.exit(1);
});
