import { defineEval } from "eve/evals";

export default defineEval({
  description: "CEO lists action items for the active company.",
  tags: ["smoke", "operating"],
  async test(t) {
    await t.send("EVE_EVAL: list action items using list_action_items.");
    t.succeeded();
    t.calledTool("list_action_items", { count: 1 });
  },
});
