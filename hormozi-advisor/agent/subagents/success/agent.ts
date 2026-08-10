import { defineAgent } from "eve";

import { resolveModel } from "../../lib/model.js";

export default defineAgent({
  description: "Owns retention systems and lifetime value expansion after the sale. Use when the user needs churn reduction, onboarding, or ascension.",
  model: resolveModel("department"),
});
