import { defineTool } from "eve/tools";
import { z } from "zod";

import { completeActionItem } from "../lib/action-items-service.js";
import { resolveCompanyScope } from "../lib/tenant.js";

export default defineTool({
  description: "Mark an action item as done.",
  inputSchema: z
    .object({
      id: z.string(),
    })
    .strict(),
  async execute(input, ctx) {
    const scope = resolveCompanyScope(ctx);
    return completeActionItem(scope, input.id);
  },
});
