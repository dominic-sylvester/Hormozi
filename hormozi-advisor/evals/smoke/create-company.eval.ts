import { defineEval } from "eve/evals";

export default defineEval({
  description: "CEO creates a new company bucket for multi-company users.",
  tags: ["smoke", "company-state", "multi-company"],
  async test(t) {
    await t.send("EVE_EVAL: create eval company for a second business.");
    t.calledTool("create_company", { count: 1 });
    t.succeeded();
  },
});
