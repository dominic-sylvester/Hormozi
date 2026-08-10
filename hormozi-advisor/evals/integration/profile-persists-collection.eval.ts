import { defineEval } from "eve/evals";
import { includes } from "eve/evals/expect";

export default defineEval({
  description: "Company profile survives a new session via the content collection.",
  tags: ["integration", "persistence", "content-collection"],
  async test(t) {
    await t.send("EVE_EVAL: multi-turn persist profile for Eval Fitness Co.");
    t.calledTool("update_company_profile", { count: 1 });

    const session = t.newSession();
    const readTurn = await session.send("EVE_EVAL: multi-turn verify profile still set.");
    session.succeeded();
    const call = readTurn.requireToolCall("get_company_profile");
    await t.require(JSON.stringify(call.output), includes("Eval Fitness Co"));
  },
});
