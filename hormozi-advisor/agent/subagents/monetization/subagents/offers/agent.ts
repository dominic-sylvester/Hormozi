import { defineAgent } from "eve";

export default defineAgent({
  description:
    "Offers specialist. Use for offers frameworks, tactics, audits, and examples from Alex Hormozi's material.",
  model: process.env.HORMOZI_SPECIALIST_MODEL ?? process.env.HORMOZI_SUBAGENT_MODEL ?? process.env.HORMOZI_AGENT_MODEL,
});
