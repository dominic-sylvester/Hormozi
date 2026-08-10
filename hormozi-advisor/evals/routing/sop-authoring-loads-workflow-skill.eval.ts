import { defineEval } from "eve/evals";

export default defineEval({
  description: "CEO loads workflow-sop-authoring before SOP creation requests.",
  tags: ["routing", "operating", "sop-authoring"],
  async test(t) {
    await t.send("EVE_EVAL: load workflow-sop-authoring for a new weekly sales SOP.");
    t.succeeded();
    t.loadedSkill("workflow-sop-authoring", { count: 1 });
  },
});
