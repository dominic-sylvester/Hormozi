import { defineEval } from "eve/evals";

export default defineEval({
  description: "CEO runs onboarding across setup and catalog upserts.",
  tags: ["integration", "multi-turn", "company-state"],
  async test(t) {
    const setupTurn = await t.send(
      "EVE_EVAL: multi-turn company setup workflow for a new business.",
    );
    setupTurn.loadedSkill("workflow-company-setup", { count: 1 });
    setupTurn.expectOk();

    const offerTurn = await t.send("EVE_EVAL: multi-turn persist offer for Eval Fitness Co.");
    offerTurn.calledTool("upsert_offer", { count: 1 });
    offerTurn.expectOk();

    const avatarTurn = await t.send("EVE_EVAL: multi-turn persist avatar for Eval Fitness Co.");
    avatarTurn.calledTool("upsert_avatar", { count: 1 });
    avatarTurn.succeeded();
  },
});
