import { createRssFetchWorker } from "./rss-fetch";
import { createAiExtractWorker } from "./ai-extract";
import { createSocialPostWorker } from "./social-post";
import { registerCronJobs } from "@/lib/queue/cron";

async function main() {
  console.log("[workers] Starting worker processes...");

  // Register cron schedules
  await registerCronJobs();
  console.log("[workers] Cron jobs registered");

  // Start workers
  const rssFetchWorker = createRssFetchWorker();
  console.log("[workers] RSS fetch worker started");

  const aiExtractWorker = createAiExtractWorker();
  console.log("[workers] AI extract worker started");

  const socialPostWorker = createSocialPostWorker();
  console.log("[workers] Social post worker started");

  // Graceful shutdown
  const shutdown = async () => {
    console.log("[workers] Shutting down...");
    await Promise.all([
      rssFetchWorker.close(),
      aiExtractWorker.close(),
      socialPostWorker.close(),
    ]);
    process.exit(0);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

main().catch((err) => {
  console.error("[workers] Fatal error:", err);
  process.exit(1);
});
