import { defineEval } from "eve/evals";

export default defineEval({
  description: "CEO upserts catalog entries, sets active context, delegates, then loads launch workflow.",
  tags: ["integration", "multi-turn", "routing"],
  async test(t) {
    const offerTurn = await t.send("EVE_EVAL: multi-turn persist offer for Eval Fitness Co.");
    offerTurn.calledTool("upsert_offer", { count: 1 });
    offerTurn.expectOk();

    const avatarTurn = await t.send("EVE_EVAL: multi-turn persist avatar for Eval Fitness Co.");
    avatarTurn.calledTool("upsert_avatar", { count: 1 });
    avatarTurn.expectOk();

    const activeTurn = await t.send("EVE_EVAL: set active context for coaching work.");
    activeTurn.calledTool("set_active_context", { count: 1 });
    activeTurn.expectOk();

    const delegateTurn = await t.send("EVE_EVAL: multi-turn growth brief using the company profile.");
    delegateTurn.calledSubagent("growth", { count: 1 });
    delegateTurn.expectOk();

    const workflowTurn = await t.send("EVE_EVAL: multi-turn launch workflow for our coaching program.");
    workflowTurn.loadedSkill("workflow-launch-offer", { count: 1 });
    workflowTurn.succeeded();
  },
});
