import { defineSchedule } from "eve/schedules";

export default defineSchedule({
  cron: "0 15 1 * *",
  markdown: `You are the CEO reviewing monthly unit economics.

Delegate to monetization for offer/pricing/LTV analysis, then success for retention trends, then growth for CAC and pipeline quality.

Deliver a one-page summary with: CAC, LTGP, payback period, gross margin, and one pricing or retention lever to pull next month.`,
});
