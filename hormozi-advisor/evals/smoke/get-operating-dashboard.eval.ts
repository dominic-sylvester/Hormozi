import { defineEval } from "eve/evals";

export default defineEval({
  description: "CEO loads the operating dashboard.",
  tags: ["smoke", "operating"],
  async test(t) {
    await t.send("EVE_EVAL: get operating dashboard using get_operating_dashboard.");
    t.succeeded();
    t.calledTool("get_operating_dashboard", { count: 1 });
  },
});
