import { defineAgent } from "eve";

export default defineAgent({
  description: "Owns lead generation, hooks, paid/organic ads, lead nurture, and the marketing machine. Use when the user needs traffic, attention, or pipeline.",
  model: process.env.HORMOZI_DEPARTMENT_MODEL ?? process.env.HORMOZI_SUBAGENT_MODEL ?? process.env.HORMOZI_AGENT_MODEL,
});
