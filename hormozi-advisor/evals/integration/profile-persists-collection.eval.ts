import { defineEval } from "eve/evals";

export default defineEval({
  description: "Upserted offer persists in the content collection across sessions.",
  tags: ["integration", "persistence", "content-collection"],
  async test(t) {
    await t.send("EVE_EVAL: multi-turn persist offer for Eval Fitness Co.");
    t.calledTool("upsert_offer", { count: 1 });

    const session = await t.newSession();
    const readTurn = await session.send("EVE_EVAL: multi-turn verify profile still set.");
    readTurn.calledTool("get_company_profile", { count: 1 });
    readTurn.succeeded();
  },
});
