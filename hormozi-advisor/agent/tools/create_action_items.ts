import { defineTool } from "eve/tools";
import { z } from "zod";

import { createActionItems } from "../lib/action-items-service.js";
import { resolveCompanyScope } from "../lib/tenant.js";

const itemSchema = z
  .object({
    title: z.string(),
    description: z.string().optional(),
    owner: z.enum(["user", "ceo", "growth", "monetization", "sales", "success", "brand"]).optional(),
    priority: z.enum(["low", "medium", "high"]).optional(),
    dueAt: z.string().nullable().optional(),
    offerId: z.string().nullable().optional(),
    avatarId: z.string().nullable().optional(),
    department: z.string().nullable().optional(),
    source: z.string().optional(),
    sopId: z.string().nullable().optional(),
    sopStepOrder: z.number().nullable().optional(),
  })
  .strict();

export default defineTool({
  description: "Create one or more action items for the active company.",
  inputSchema: z
    .object({
      items: z.array(itemSchema).min(1),
    })
    .strict(),
  async execute(input, ctx) {
    const scope = resolveCompanyScope(ctx);
    return createActionItems(scope, input.items);
  },
});
