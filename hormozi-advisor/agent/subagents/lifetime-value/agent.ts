import { defineAgent } from "eve";

export default defineAgent({
  description:
    "Specialist for Alex Hormozi's Lifetime Value material. Use when the question is primarily about lifetime value frameworks, tactics, or examples.",
  model: process.env.HORMOZI_SUBAGENT_MODEL ?? process.env.HORMOZI_AGENT_MODEL,
});
