import cron from "cron";
import { processPendingTranscripts } from "../controllers/transcribe.controllers";

export const startScheduler = (): void => {
  // Run every 30 minutes
  const job = new cron.CronJob("*/30 * * * *", async () => {
    console.log("Running scheduled summary generation...");
    await processPendingTranscripts();
  });

  job.start();
  console.log("Scheduler started - will run every 30 minutes");
}; 