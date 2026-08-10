import { defineEval } from "eve/evals";

export default defineEval({
  description: "CEO spawns action items from the weekly review SOP.",
  tags: ["integration", "operating"],
  async test(t) {
    await t.send("EVE_EVAL: multi-turn seed weekly review sop for spawn test.");
    await t.send("EVE_EVAL: spawn action items from sop weekly-review-synthesis.");
    t.calledTool("spawn_action_items_from_sop", { count: 1 });
    t.succeeded();
  },
});
