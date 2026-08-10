import { defineEval } from "eve/evals";

export default defineEval({
  description: "CEO updates the shared company profile via update_company_profile.",
  tags: ["smoke", "company-state"],
  async test(t) {
    await t.send("EVE_EVAL: update the shared company profile for Eval Fitness Co.");
    t.succeeded();
    t.calledTool("update_company_profile", { count: 1 });
  },
});
