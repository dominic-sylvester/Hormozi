import { defineState } from "eve/context";

export type CompanyMetrics = {
  leadsWeekly: number | null;
  adSpendWeekly: number | null;
  cpl: number | null;
  showRate: number | null;
  closeRate: number | null;
  churnRate: number | null;
};

export type CompanyProfile = {
  companyName: string;
  offer: string;
  avatar: string;
  promise: string;
  pricePoint: string;
  channel: string;
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

export function formatProfileMarkdown(profile: CompanyProfile): string {
  const metrics = profile.metrics;
  const goals = profile.goals.length > 0 ? profile.goals.map((g) => `- ${g}`).join("\n") : "- (none yet)";

  return `# Company Profile

> Shared state for the Hormozi company. Updated by the CEO via \`update_company_profile\`.

## Identity

- **Company:** ${profile.companyName || "(unset)"}
- **Offer:** ${profile.offer || "(unset)"}
- **Avatar (ICP):** ${profile.avatar || "(unset)"}
- **Promise:** ${profile.promise || "(unset)"}
- **Price point:** ${profile.pricePoint || "(unset)"}
- **Primary channel:** ${profile.channel || "(unset)"}

## Metrics

- Leads / week: ${metrics.leadsWeekly ?? "(unset)"}
- Ad spend / week: ${metrics.adSpendWeekly ?? "(unset)"}
- CPL: ${metrics.cpl ?? "(unset)"}
- Show rate: ${metrics.showRate ?? "(unset)"}
- Close rate: ${metrics.closeRate ?? "(unset)"}
- Churn rate: ${metrics.churnRate ?? "(unset)"}

## Goals

${goals}

_Last updated: ${profile.updatedAt ?? "never"}_
`;
}
