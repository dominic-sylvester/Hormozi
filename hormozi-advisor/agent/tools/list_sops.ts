import { defineTool } from "eve/tools";
import { z } from "zod";

import { listSops } from "../lib/sops-service.js";
import { resolveCompanyScope } from "../lib/tenant.js";

export default defineTool({
  description: "List SOPs for the active company. Seeds default templates on first read.",
  inputSchema: z.object({}).strict(),
  async execute(_input, ctx) {
    const scope = resolveCompanyScope(ctx);
    return listSops(scope);
  },
});
