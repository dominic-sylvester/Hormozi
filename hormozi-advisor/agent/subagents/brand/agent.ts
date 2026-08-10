import { defineAgent } from "eve";

export default defineAgent({
  description: "Owns positioning, brand strategy, and market perception. Use when the user needs brand voice, identity, or reputation.",
  model: process.env.HORMOZI_DEPARTMENT_MODEL ?? process.env.HORMOZI_SUBAGENT_MODEL ?? process.env.HORMOZI_AGENT_MODEL,
});
