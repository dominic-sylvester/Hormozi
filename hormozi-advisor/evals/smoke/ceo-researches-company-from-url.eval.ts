import { defineEval } from "eve/evals";

export default defineEval({
  description: "CEO researches a company website before onboarding.",
  tags: ["smoke", "onboarding", "research"],
  async test(t) {
    await t.send(
      "EVE_EVAL: research my company from https://eval-fitness.com and summarize the draft profile.",
    );
    t.calledTool("research_company_from_url", { count: 1 });
    t.succeeded();
  },
});
