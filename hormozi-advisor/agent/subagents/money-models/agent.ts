import { defineAgent } from "eve";

export default defineAgent({
  description:
    "Specialist for Alex Hormozi's Money Models material. Use when the question is primarily about money models frameworks, tactics, or examples.",
  model: process.env.HORMOZI_SUBAGENT_MODEL ?? process.env.HORMOZI_AGENT_MODEL,
});
