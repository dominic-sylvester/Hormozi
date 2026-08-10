import { defineEval } from "eve/evals";

export default defineEval({
  description: "CEO updates profile, delegates to growth, then loads launch workflow.",
  tags: ["integration", "multi-turn", "routing"],
  async test(t) {
    await t.send("EVE_EVAL: multi-turn persist profile for Eval Fitness Co.");
    t.calledTool("update_company_profile", { count: 1 });

    await t.send("EVE_EVAL: multi-turn growth brief using the company profile.");
    t.calledSubagent("growth", { count: 1 });

    await t.send("EVE_EVAL: multi-turn launch workflow for our coaching program.");
    t.loadedSkill("workflow-launch-offer", { count: 1 });
    t.succeeded();
  },
});
