import { defineAgent } from "eve";

export default defineAgent({
  description: "Owns closing frameworks and proof assets that convert interest into customers. Use when the user needs sales process, objections, or proof.",
  model: process.env.HORMOZI_DEPARTMENT_MODEL ?? process.env.HORMOZI_SUBAGENT_MODEL ?? process.env.HORMOZI_AGENT_MODEL,
});
