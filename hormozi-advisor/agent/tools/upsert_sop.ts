import { defineTool } from "eve/tools";
import { z } from "zod";

import { upsertSop } from "../lib/sops-service.js";
import { resolveCompanyScope } from "../lib/tenant.js";

const stepSchema = z
  .object({
    order: z.number(),
    title: z.string(),
    instruction: z.string(),
    ownerRole: z.enum(["user", "ceo", "growth", "monetization", "sales", "success", "brand"]),
    estimatedMinutes: z.number().nullable().optional(),
    checklist: z.array(z.string()).optional(),
  })
  .strict();

export default defineTool({
  description: "Create or update an SOP for the active company.",
  inputSchema: z
    .object({
      id: z.string().optional(),
      name: z.string(),
      department: z.string(),
      trigger: z.string(),
      description: z.string(),
      steps: z.array(stepSchema).min(1),
      linkedPlaybookSkills: z.array(z.string()).optional(),
      status: z.enum(["draft", "active", "archived"]).optional(),
    })
    .strict(),
  async execute(input, ctx) {
    const scope = resolveCompanyScope(ctx);
    return upsertSop(scope, {
      id: input.id ?? "",
      name: input.name,
      department: input.department,
      trigger: input.trigger,
      description: input.description,
      steps: input.steps.map((step) => ({
        ...step,
        estimatedMinutes: step.estimatedMinutes ?? null,
        checklist: step.checklist ?? [],
      })),
      linkedPlaybookSkills: input.linkedPlaybookSkills ?? [],
      status: input.status ?? "active",
    });
  },
});
