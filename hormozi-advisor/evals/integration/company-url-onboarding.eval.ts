import { defineEval } from "eve/evals";

export default defineEval({
  description: "CEO researches a URL, confirms the draft, and persists the company profile.",
  tags: ["integration", "multi-turn", "onboarding", "research"],
  async test(t) {
    const researchTurn = await t.send(
      "EVE_EVAL: multi-turn research company from https://eval-fitness.com",
    );
    researchTurn.calledTool("research_company_from_url", { count: 1 });
    researchTurn.expectOk();

    const confirmTurn = await t.send("EVE_EVAL: multi-turn confirm researched profile.");
    confirmTurn.calledTool("update_company_profile", { count: 1 });
    confirmTurn.succeeded();
  },
});
