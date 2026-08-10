import { defineAgent } from "eve";

export default defineAgent({
  description: "Owns offers, pricing, money models, price raises, and fast-cash plays. Use when the user needs revenue model, pricing, or offer design.",
  model: process.env.HORMOZI_DEPARTMENT_MODEL ?? process.env.HORMOZI_SUBAGENT_MODEL ?? process.env.HORMOZI_AGENT_MODEL,
});
