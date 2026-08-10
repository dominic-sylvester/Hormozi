import { defineAgent } from "eve";

export default defineAgent({
  description:
    "Specialist for Alex Hormozi's Proof Checklist material. Use when the question is primarily about proof checklist frameworks, tactics, or examples.",
  model: process.env.HORMOZI_SUBAGENT_MODEL ?? process.env.HORMOZI_AGENT_MODEL,
});
