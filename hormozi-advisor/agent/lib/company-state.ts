import { defineState } from "eve/context";

export type CompanyMetrics = {
  leadsWeekly: number | null;
  adSpendWeekly: number | null;
  cpl: number | null;
  showRate: number | null;
  closeRate: number | null;
  churnRate: number | null;
};

export type ResearchSource = {
  url: string;
  title: string;
};

export type CompanyProfile = {
  companyName: string;
  offer: string;
  avatar: string;
  promise: string;
  pricePoint: string;
  channel: string;
  websiteUrl: string;
  researchNotes: string;
  researchSources: ResearchSource[];
  metrics: CompanyMetrics;
  goals: string[];
  updatedAt: string | null;
};

export const emptyCompanyProfile = (): CompanyProfile => ({
  companyName: "",
  offer: "",
  avatar: "",
  promise: "",
  pricePoint: "",
  channel: "",
  websiteUrl: "",
  researchNotes: "",
  researchSources: [],
  metrics: {
    leadsWeekly: null,
    adSpendWeekly: null,
    cpl: null,
    showRate: null,
    closeRate: null,
    churnRate: null,
  },
  goals: [],
  updatedAt: null,
});

export const companyProfile = defineState(
  "hormozi-company.profile",
  emptyCompanyProfile,
);

export function normalizeCompanyProfile(
  profile: Partial<CompanyProfile> | null | undefined,
): CompanyProfile {
  const base = emptyCompanyProfile();
  if (!profile) {
    return base;
  }

  return {
    ...base,
    ...profile,
    metrics: {
      ...base.metrics,
      ...(profile.metrics ?? {}),
    },
    goals: profile.goals ?? base.goals,
    researchSources: profile.researchSources ?? base.researchSources,
  };
}

export function formatProfileMarkdown(profile: CompanyProfile): string {
  const normalized = normalizeCompanyProfile(profile);
  const metrics = normalized.metrics;
  const goals =
    normalized.goals.length > 0 ? normalized.goals.map((g) => `- ${g}`).join("\n") : "- (none yet)";
  const sources =
    normalized.researchSources.length > 0
      ? normalized.researchSources.map((source) => `- ${source.title}: ${source.url}`).join("\n")
      : "- (none yet)";

  return `# Company Profile

> Shared state for the Hormozi company. Updated by the CEO via \`update_company_profile\`.

## Identity

- **Company:** ${normalized.companyName || "(unset)"}
- **Website:** ${normalized.websiteUrl || "(unset)"}
- **Offer:** ${normalized.offer || "(unset)"}
- **Avatar (ICP):** ${normalized.avatar || "(unset)"}
- **Promise:** ${normalized.promise || "(unset)"}
- **Price point:** ${normalized.pricePoint || "(unset)"}
- **Primary channel:** ${normalized.channel || "(unset)"}

## Research

${normalized.researchNotes || "(none yet)"}

### Sources

${sources}

## Metrics

- Leads / week: ${metrics.leadsWeekly ?? "(unset)"}
- Ad spend / week: ${metrics.adSpendWeekly ?? "(unset)"}
- CPL: ${metrics.cpl ?? "(unset)"}
- Show rate: ${metrics.showRate ?? "(unset)"}
- Close rate: ${metrics.closeRate ?? "(unset)"}
- Churn rate: ${metrics.churnRate ?? "(unset)"}

## Goals

${goals}

_Last updated: ${normalized.updatedAt ?? "never"}_
`;
}
