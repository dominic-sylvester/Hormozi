import { defineAgent } from "eve";

import { resolveModel } from "../../../../lib/model.js";

export default defineAgent({
  description:
    "Proof Checklist specialist. Use for proof checklist frameworks, tactics, audits, and examples from Alex Hormozi's material.",
  model: resolveModel("specialist"),
});
