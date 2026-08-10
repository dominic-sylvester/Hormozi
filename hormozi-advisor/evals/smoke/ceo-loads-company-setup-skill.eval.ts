import { defineEval } from "eve/evals";

export default defineEval({
  description: "CEO loads the company setup workflow for onboarding.",
  tags: ["smoke", "onboarding"],
  async test(t) {
    await t.send("EVE_EVAL: run company setup workflow for a new business.");
    t.succeeded();
    t.loadedSkill("workflow-company-setup", { count: 1 });
  },
});
