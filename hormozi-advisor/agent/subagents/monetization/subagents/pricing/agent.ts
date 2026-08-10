import { defineAgent } from "eve";

import { resolveModel } from "../../../../lib/model.js";

export default defineAgent({
  description:
    "Pricing specialist. Use for pricing frameworks, tactics, audits, and examples from Alex Hormozi's material.",
  model: resolveModel("specialist"),
});
