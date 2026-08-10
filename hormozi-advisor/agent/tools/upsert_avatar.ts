import { defineTool } from "eve/tools";
import { z } from "zod";

import {
  persistAndSyncCompanyProfile,
  upsertAvatarInProfile,
} from "../lib/company-profile-service.js";
import { companyProfile, slugifyId } from "../lib/company-state.js";
import { resolveCompanyScope } from "../lib/tenant.js";

const upsertAvatarSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().min(1),
    description: z.string().optional(),
    pains: z.array(z.string()).optional(),
    desires: z.array(z.string()).optional(),
    status: z.enum(["draft", "active", "archived"]).optional(),
  })
  .strict();

export default defineTool({
  description: "Create or update one ideal client profile (avatar) in the company catalog.",
  inputSchema: upsertAvatarSchema,
  async execute(input, ctx) {
    const scope = resolveCompanyScope(ctx);
    companyProfile.update((current) => upsertAvatarInProfile(current, input));
    const profile = companyProfile.get();
    await persistAndSyncCompanyProfile(scope, profile, ctx);
    const id = slugifyId(input.id ?? input.name);
    return profile.avatars.find((avatar) => avatar.id === id) ?? profile.avatars.at(-1);
  },
});
