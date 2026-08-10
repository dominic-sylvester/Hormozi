import { defineEval } from "eve/evals";

export default defineEval({
  description: "CEO spawns action items from the weekly review SOP.",
  tags: ["integration", "operating"],
  async test(t) {
    await t.send("EVE_EVAL: ensure default calendar first.");
    t.calledTool("ensure_default_calendar", { count: 1 });

    const spawnTurn = await t.send("EVE_EVAL: spawn action items from sop weekly-review-synthesis.");
    spawnTurn.calledTool("spawn_action_items_from_sop", { count: 1 });
    spawnTurn.succeeded();
  },
});
