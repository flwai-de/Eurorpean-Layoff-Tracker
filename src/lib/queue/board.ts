import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import {
  rssFetchQueue,
  aiExtractQueue,
  socialPostQueue,
  newsletterSendQueue,
  maintenanceQueue,
} from "./index";

const BASE_PATH = "/api/admin/queue";

export const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath(BASE_PATH);

createBullBoard({
  queues: [
    new BullMQAdapter(rssFetchQueue),
    new BullMQAdapter(aiExtractQueue),
    new BullMQAdapter(socialPostQueue),
    new BullMQAdapter(newsletterSendQueue),
    new BullMQAdapter(maintenanceQueue),
  ],
  serverAdapter,
});
