import { defineEval } from "eve/evals";

export default defineEval({
  description: "CEO sets active offer and avatar context for downstream workflows.",
  tags: ["smoke", "company-state", "routing"],
  async test(t) {
    await t.send("EVE_EVAL: set active context for coaching work.");
    t.calledTool("set_active_context", { count: 1 });
    t.succeeded();
  },
});
