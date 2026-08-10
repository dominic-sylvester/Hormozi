import { defineTool } from "eve/tools";
import { z } from "zod";

import { upsertCalendarEvent } from "../lib/calendar-service.js";
import { resolveCompanyScope } from "../lib/tenant.js";

export default defineTool({
  description: "Create or update an operating calendar event.",
  inputSchema: z
    .object({
      id: z.string().optional(),
      title: z.string(),
      description: z.string(),
      cadence: z.enum(["once", "daily", "weekly", "biweekly", "monthly", "quarterly"]),
      cron: z.string().nullable().optional(),
      nextRunAt: z.string().nullable().optional(),
      workflowSkill: z.string().nullable().optional(),
      sopId: z.string().nullable().optional(),
      department: z.string().nullable().optional(),
      enabled: z.boolean().optional(),
    })
    .strict(),
  async execute(input, ctx) {
    const scope = resolveCompanyScope(ctx);
    return upsertCalendarEvent(scope, {
      id: input.id ?? "",
      title: input.title,
      description: input.description,
      cadence: input.cadence,
      cron: input.cron ?? null,
      nextRunAt: input.nextRunAt ?? null,
      workflowSkill: input.workflowSkill ?? null,
      sopId: input.sopId ?? null,
      department: input.department ?? null,
      enabled: input.enabled ?? true,
    });
  },
});
