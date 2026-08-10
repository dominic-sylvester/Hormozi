import { defineAgent } from "eve";

import { resolveModel } from "../../lib/model.js";

export default defineAgent({
  description: "Owns positioning, brand strategy, and market perception. Use when the user needs brand voice, identity, or reputation.",
  model: resolveModel("department"),
});
