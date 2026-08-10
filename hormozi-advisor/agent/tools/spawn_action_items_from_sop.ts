import { defineTool } from "eve/tools";
import { z } from "zod";

import { spawnActionItemsFromSop } from "../lib/sops-service.js";
import { resolveCompanyScope } from "../lib/tenant.js";

export default defineTool({
  description: "Spawn action items from every step in an SOP.",
  inputSchema: z
    .object({
      sopId: z.string(),
      dueAt: z.string().nullable().optional(),
      source: z.string().optional(),
    })
    .strict(),
  async execute(input, ctx) {
    const scope = resolveCompanyScope(ctx);
    return spawnActionItemsFromSop(scope, input.sopId, {
      dueAt: input.dueAt ?? null,
      source: input.source,
    });
  },
});
