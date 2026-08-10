import { defineEval } from "eve/evals";

export default defineEval({
  description: "CEO creates an action item via create_action_items.",
  tags: ["smoke", "operating"],
  async test(t) {
    await t.send("EVE_EVAL: create eval action item for growth priority.");
    t.succeeded();
    t.calledTool("create_action_items", { count: 1 });
  },
});
