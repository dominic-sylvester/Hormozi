import { defineEval } from "eve/evals";

export default defineEval({
  description: "Action items persist in the content collection across sessions.",
  tags: ["integration", "operating", "content-collection"],
  async test(t) {
    await t.send("EVE_EVAL: multi-turn create action item for Eval Fitness Co.");
    t.calledTool("create_action_items", { count: 1 });

    const session = await t.newSession();
    const readTurn = await session.send("EVE_EVAL: multi-turn verify action item still open.");
    readTurn.calledTool("list_action_items", { count: 1 });
    readTurn.succeeded();
  },
});
