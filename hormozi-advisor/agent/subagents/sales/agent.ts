import { defineAgent } from "eve";

import { resolveModel } from "../../lib/model.js";

export default defineAgent({
  description: "Owns closing frameworks and proof assets that convert interest into customers. Use when the user needs sales process, objections, or proof.",
  model: resolveModel("department"),
});
