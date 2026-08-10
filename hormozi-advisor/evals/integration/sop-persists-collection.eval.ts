import { defineEval } from "eve/evals";

export default defineEval({
  description: "Upserted SOP persists in the content collection across sessions.",
  tags: ["integration", "operating", "content-collection"],
  async test(t) {
    await t.send("EVE_EVAL: multi-turn upsert eval sop for sales follow-up.");
    t.calledTool("upsert_sop", { count: 1 });

    const session = await t.newSession();
    const readTurn = await session.send("EVE_EVAL: list sops to verify eval sop persisted.");
    readTurn.calledTool("list_sops", { count: 1 });
    readTurn.succeeded();
  },
});
