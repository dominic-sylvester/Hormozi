import { defineAgent } from "eve";

import { resolveModel } from "../../../../lib/model.js";

export default defineAgent({
  description:
    "Retention specialist. Use for retention frameworks, tactics, audits, and examples from Alex Hormozi's material.",
  model: resolveModel("specialist"),
});
