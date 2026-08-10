import { defineAgent } from "eve";

import { resolveModel } from "../../../../lib/model.js";

export default defineAgent({
  description:
    "Closing specialist. Use for closing frameworks, tactics, audits, and examples from Alex Hormozi's material.",
  model: resolveModel("specialist"),
});
