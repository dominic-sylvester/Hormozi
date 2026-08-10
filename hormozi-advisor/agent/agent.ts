import { defineAgent } from "eve";

import { resolveModel } from "./lib/model.js";

const evalMode = process.env.EVE_EVAL === "1";

export default defineAgent({
  ...(evalMode ? {} : { compaction: { thresholdPercent: 0.9 } }),
  model: resolveModel("ceo"),
});
