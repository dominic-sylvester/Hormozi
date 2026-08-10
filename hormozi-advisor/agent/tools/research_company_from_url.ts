import { defineTool } from "eve/tools";
import { z } from "zod";

import { researchCompanyFromUrl } from "../lib/company-research.js";

export default defineTool({
  description:
    "Research an existing company from its public website. Fetches key pages, infers a draft profile (offer, ICP, promise, pricing signals), and returns research notes for user confirmation before persisting.",
  inputSchema: z
    .object({
      url: z.string().min(1).describe("Company website URL, e.g. https://example.com"),
    })
    .strict(),
  async execute(input) {
    return researchCompanyFromUrl(input.url);
  },
});
