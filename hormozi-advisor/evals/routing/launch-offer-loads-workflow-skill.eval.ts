import { defineEval } from "eve/evals";

export default defineEval({
  description: "CEO loads the launch-offer workflow skill before orchestration.",
  tags: ["routing", "workflows"],
  async test(t) {
    await t.send("EVE_EVAL: launch offer workflow for a new coaching program.");
    t.succeeded();
    t.loadedSkill("workflow-launch-offer", { count: 1 });
  },
});
