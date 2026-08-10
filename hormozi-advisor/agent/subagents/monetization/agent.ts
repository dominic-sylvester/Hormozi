import { defineAgent } from "eve";

import { resolveModel } from "../../lib/model.js";

export default defineAgent({
  description: "Owns offers, pricing, money models, price raises, and fast-cash plays. Use when the user needs revenue model, pricing, or offer design.",
  model: resolveModel("department"),
});
