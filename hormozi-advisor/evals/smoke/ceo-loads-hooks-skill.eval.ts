import { defineEval } from "eve/evals";

export default defineEval({
  description: "CEO loads the hooks playbook skill on demand.",
  tags: ["smoke", "skills"],
  async test(t) {
    await t.send("EVE_EVAL: load hooks skill for this answer.");
    t.succeeded();
    t.loadedSkill("hooks", { count: 1 });
  },
});
