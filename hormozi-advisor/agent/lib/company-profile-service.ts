import type { ToolContext } from "eve/tools";

import { getCompanyStore } from "./company-store.js";
import {
  companyProfile,
  formatProfileMarkdown,
  type CompanyMetrics,
  type CompanyProfile,
} from "./company-state.js";
import type { CompanyScope } from "./tenant.js";

export function mergeCompanyProfile(
  current: CompanyProfile,
  patch: Partial<Omit<CompanyProfile, "metrics" | "goals">> & {
    metrics?: Partial<CompanyMetrics>;
    goals?: string[];
  },
): CompanyProfile {
  const metrics: CompanyMetrics = {
    ...current.metrics,
    ...(patch.metrics ?? {}),
  };

  return {
    ...current,
    ...patch,
    metrics,
    goals: patch.goals ?? current.goals,
    updatedAt: new Date().toISOString(),
  };
}

export async function hydrateCompanyProfile(scope: CompanyScope): Promise<void> {
  const store = getCompanyStore();
  if (!store) {
    return;
  }

  const stored = await store.get(scope);
  if (stored) {
    companyProfile.update(() => stored);
  }
}

export async function persistCompanyProfile(
  scope: CompanyScope,
  profile: CompanyProfile,
): Promise<void> {
  const store = getCompanyStore();
  if (!store) {
    return;
  }

  await store.put(scope, profile);
}

export async function syncProfileToSandbox(
  profile: CompanyProfile,
  ctx: ToolContext,
): Promise<void> {
  try {
    const sandbox = await ctx.getSandbox();
    await sandbox.writeTextFile({
      path: "company/profile.md",
      content: formatProfileMarkdown(profile),
    });
  } catch {
    // Sandbox may be unavailable during discovery or some runtime modes.
  }
}

export async function persistAndSyncCompanyProfile(
  scope: CompanyScope,
  profile: CompanyProfile,
  ctx: ToolContext,
): Promise<void> {
  await persistCompanyProfile(scope, profile);
  await syncProfileToSandbox(profile, ctx);
}
