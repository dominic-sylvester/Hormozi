import { defineAgent } from "eve";

import { resolveModel } from "../../../../lib/model.js";

export default defineAgent({
  description:
    "Fast Cash specialist. Use for fast cash frameworks, tactics, audits, and examples from Alex Hormozi's material.",
  model: resolveModel("specialist"),
});
