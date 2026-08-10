import { defineEval } from "eve/evals";

export default defineEval({
  description: "CEO upserts an offer into the shared catalog.",
  tags: ["smoke", "company-state"],
  async test(t) {
    await t.send("EVE_EVAL: upsert eval offer for Eval Fitness Co.");
    t.calledTool("upsert_offer", { count: 1 });
    t.succeeded();
  },
});
