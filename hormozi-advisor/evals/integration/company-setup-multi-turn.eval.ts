import { defineEval } from "eve/evals";

export default defineEval({
  description: "CEO runs onboarding across setup and profile update turns.",
  tags: ["integration", "multi-turn", "company-state"],
  async test(t) {
    const setupTurn = await t.send(
      "EVE_EVAL: multi-turn company setup workflow for a new business.",
    );
    setupTurn.loadedSkill("workflow-company-setup", { count: 1 });
    setupTurn.expectOk();

    const persistTurn = await t.send(
      "EVE_EVAL: multi-turn persist profile for Eval Fitness Co.",
    );
    persistTurn.calledTool("update_company_profile", { count: 1 });
    persistTurn.succeeded();
  },
});
