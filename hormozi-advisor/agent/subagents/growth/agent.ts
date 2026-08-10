import { defineAgent } from "eve";

import { resolveModel } from "../../lib/model.js";

export default defineAgent({
  description: "Owns lead generation, hooks, paid/organic ads, lead nurture, and the marketing machine. Use when the user needs traffic, attention, or pipeline.",
  model: resolveModel("department"),
});
