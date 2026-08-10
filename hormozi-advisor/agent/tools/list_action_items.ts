import { defineTool } from "eve/tools";
import { z } from "zod";

import { listActionItems } from "../lib/action-items-service.js";
import { resolveCompanyScope } from "../lib/tenant.js";

const statusSchema = z.enum(["open", "in_progress", "blocked", "done", "cancelled"]);

export default defineTool({
  description: "List action items for the active company, optionally filtered by status or department.",
  inputSchema: z
    .object({
      status: z.union([statusSchema, z.array(statusSchema)]).optional(),
      department: z.string().optional(),
      offerId: z.string().optional(),
    })
    .strict(),
  async execute(input, ctx) {
    const scope = resolveCompanyScope(ctx);
    return listActionItems(scope, input);
  },
});
