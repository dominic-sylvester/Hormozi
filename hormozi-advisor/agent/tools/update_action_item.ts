import { defineTool } from "eve/tools";
import { z } from "zod";

import { updateActionItem } from "../lib/action-items-service.js";
import { resolveCompanyScope } from "../lib/tenant.js";

export default defineTool({
  description: "Update fields on an existing action item.",
  inputSchema: z
    .object({
      id: z.string(),
      title: z.string().optional(),
      description: z.string().optional(),
      owner: z.enum(["user", "ceo", "growth", "monetization", "sales", "success", "brand"]).optional(),
      status: z.enum(["open", "in_progress", "blocked", "done", "cancelled"]).optional(),
      priority: z.enum(["low", "medium", "high"]).optional(),
      dueAt: z.string().nullable().optional(),
      department: z.string().nullable().optional(),
      offerId: z.string().nullable().optional(),
      avatarId: z.string().nullable().optional(),
    })
    .strict(),
  async execute(input, ctx) {
    const scope = resolveCompanyScope(ctx);
    const { id, ...patch } = input;
    return updateActionItem(scope, id, patch);
  },
});
