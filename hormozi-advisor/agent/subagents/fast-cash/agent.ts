import { defineAgent } from "eve";

export default defineAgent({
  description:
    "Specialist for Alex Hormozi's Fast Cash material. Use when the question is primarily about fast cash frameworks, tactics, or examples.",
  model: process.env.HORMOZI_SUBAGENT_MODEL ?? process.env.HORMOZI_AGENT_MODEL,
});
