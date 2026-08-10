import { defineSchedule } from "eve/schedules";

export default defineSchedule({
  cron: "0 14 * * 1",
  markdown: `You are the CEO running the weekly Hormozi company operating review.

Load the workflow-weekly-review skill, then use the Workflow tool to run parallel reviews across growth, monetization, sales, and success for the last 7 days.

If the user has not provided metrics, ask for: leads, ad spend, CPL, show rate, close rate, cash collected, churn, and refund rate.

Deliver:
1. What worked
2. What broke
3. Top 3 priorities for next week
4. Which department owns each priority`,
});
