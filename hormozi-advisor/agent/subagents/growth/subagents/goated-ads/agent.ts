import { defineAgent } from "eve";

export default defineAgent({
  description:
    "GOATed Ads specialist. Use for goated ads frameworks, tactics, audits, and examples from Alex Hormozi's material.",
  model: process.env.HORMOZI_SPECIALIST_MODEL ?? process.env.HORMOZI_SUBAGENT_MODEL ?? process.env.HORMOZI_AGENT_MODEL,
});
