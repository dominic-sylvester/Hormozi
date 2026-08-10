import { defineEval } from "eve/evals";

export default defineEval({
  description: "CEO runs onboarding across setup, update, and read turns.",
  tags: ["integration", "multi-turn", "company-state"],
  async test(t) {
    await t.send("EVE_EVAL: multi-turn company setup workflow for a new business.");
    t.loadedSkill("workflow-company-setup", { count: 1 });

    await t.send("EVE_EVAL: multi-turn persist profile for Eval Fitness Co.");
    t.calledTool("update_company_profile", { count: 1 });

    await t.send("EVE_EVAL: multi-turn verify profile still set.");
    t.calledTool("get_company_profile", { count: 1 });
    t.succeeded();
  },
});
