import { defineEval } from "eve/evals";

export default defineEval({
  description: "CEO delegates a brief to the growth department head.",
  tags: ["smoke", "routing"],
  async test(t) {
    await t.send("EVE_EVAL: delegate to growth to audit our top-of-funnel.");
    t.succeeded();
    t.calledSubagent("growth", { count: 1 });
  },
});
