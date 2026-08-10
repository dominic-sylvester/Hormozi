import { defineAgent } from "eve";

export default defineAgent({
  description: "Owns retention systems and lifetime value expansion after the sale. Use when the user needs churn reduction, onboarding, or ascension.",
  model: process.env.HORMOZI_DEPARTMENT_MODEL ?? process.env.HORMOZI_SUBAGENT_MODEL ?? process.env.HORMOZI_AGENT_MODEL,
});
