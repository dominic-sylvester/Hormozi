import { defineEval } from "eve/evals";

export default defineEval({
  description: "CEO updates profile, delegates to growth, then loads launch workflow.",
  tags: ["integration", "multi-turn", "routing"],
  async test(t) {
    const persistTurn = await t.send(
      "EVE_EVAL: multi-turn persist profile for Eval Fitness Co.",
    );
    persistTurn.calledTool("update_company_profile", { count: 1 });
    persistTurn.expectOk();

    const delegateTurn = await t.send(
      "EVE_EVAL: multi-turn growth brief using the company profile.",
    );
    delegateTurn.calledSubagent("growth", { count: 1 });
    delegateTurn.expectOk();

    const workflowTurn = await t.send(
      "EVE_EVAL: multi-turn launch workflow for our coaching program.",
    );
    workflowTurn.loadedSkill("workflow-launch-offer", { count: 1 });
    workflowTurn.succeeded();
  },
});
