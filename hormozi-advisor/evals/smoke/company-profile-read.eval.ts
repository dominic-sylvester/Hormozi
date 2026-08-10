import { defineEval } from "eve/evals";

export default defineEval({
  description: "CEO reads the shared company profile via get_company_profile.",
  tags: ["smoke", "company-state"],
  async test(t) {
    await t.send("EVE_EVAL: read the shared company profile using get_company_profile.");
    t.succeeded();
    t.calledTool("get_company_profile", { count: 1 });
  },
});
