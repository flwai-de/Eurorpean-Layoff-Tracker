import { Queue } from "bullmq";

const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";
const parsed = new URL(redisUrl);

export const connection = {
  host: parsed.hostname,
  port: Number(parsed.port) || 6379,
  password: parsed.password || undefined,
  username: parsed.username || undefined,
};

const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: "exponential" as const,
    delay: 30_000,
  },
};

export const rssFetchQueue = new Queue("rss-fetch", {
  connection,
  defaultJobOptions,
});

export const aiExtractQueue = new Queue("ai-extract", {
  connection,
  defaultJobOptions,
});

export const socialPostQueue = new Queue("social-post", {
  connection,
  defaultJobOptions,
});

export const newsletterSendQueue = new Queue("newsletter-send", {
  connection,
  defaultJobOptions,
});

export const maintenanceQueue = new Queue("maintenance", {
  connection,
  defaultJobOptions,
});
