import { defineAgent } from "eve";

export default defineAgent({
  compaction: { thresholdPercent: 0.9 },
  model: process.env.HORMOZI_AGENT_MODEL ?? "anthropic/claude-sonnet-4.6",
});
