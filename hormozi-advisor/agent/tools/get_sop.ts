import { defineTool } from "eve/tools";
import { z } from "zod";

import { getSop } from "../lib/sops-service.js";
import { resolveCompanyScope } from "../lib/tenant.js";

export default defineTool({
  description: "Get one SOP by id for the active company.",
  inputSchema: z
    .object({
      id: z.string(),
    })
    .strict(),
  async execute(input, ctx) {
    const scope = resolveCompanyScope(ctx);
    const sop = await getSop(scope, input.id);
    if (!sop) {
      throw new Error(`Unknown SOP: ${input.id}`);
    }
    return sop;
  },
});
