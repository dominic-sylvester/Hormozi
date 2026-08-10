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

export type CatalogStatus = "draft" | "active" | "archived";

export type Offer = {
  id: string;
  name: string;
  description: string;
  promise: string;
  pricePoint: string;
  channel: string;
  status: CatalogStatus;
  targetAvatarIds: string[];
  metrics: CompanyMetrics;
  updatedAt: string;
};

export type Avatar = {
  id: string;
  name: string;
  description: string;
  pains: string[];
  desires: string[];
  status: CatalogStatus;
  updatedAt: string;
};

export type ActiveContext = {
  offerId: string | null;
  avatarId: string | null;
};

export type CompanyProfile = {
  companyName: string;
  websiteUrl: string;
  brandPromise: string;
  researchNotes: string;
  researchSources: ResearchSource[];
  metrics: CompanyMetrics;
  goals: string[];
  offers: Offer[];
  avatars: Avatar[];
  active: ActiveContext;
  updatedAt: string | null;
};

/** @deprecated Legacy flat fields kept only for migration input */
export type LegacyCompanyProfileFields = {
  offer?: string;
  avatar?: string;
  promise?: string;
  pricePoint?: string;
  channel?: string;
};

export type CompanyListItem = {
  companyId: string;
  companyName: string;
  websiteUrl: string;
  offerCount: number;
  avatarCount: number;
  updatedAt: string | null;
};

export const scopeCompanyId = defineState("hormozi-company.scopeCompanyId", () => "default");

export const emptyMetrics = (): CompanyMetrics => ({
  leadsWeekly: null,
  adSpendWeekly: null,
  cpl: null,
  showRate: null,
  closeRate: null,
  churnRate: null,
});

export const emptyCompanyProfile = (): CompanyProfile => ({
  companyName: "",
  websiteUrl: "",
  brandPromise: "",
  researchNotes: "",
  researchSources: [],
  metrics: emptyMetrics(),
  goals: [],
  offers: [],
  avatars: [],
  active: { offerId: null, avatarId: null },
  updatedAt: null,
});

export const companyProfile = defineState("hormozi-company.profile", emptyCompanyProfile);

export function slugifyId(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "item";
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function findOffer(profile: CompanyProfile, offerId: string | null | undefined): Offer | null {
  if (!offerId) return null;
  return profile.offers.find((offer) => offer.id === offerId) ?? null;
}

export function findAvatar(profile: CompanyProfile, avatarId: string | null | undefined): Avatar | null {
  if (!avatarId) return null;
  return profile.avatars.find((avatar) => avatar.id === avatarId) ?? null;
}

export function getActiveOffer(profile: CompanyProfile): Offer | null {
  return findOffer(profile, profile.active.offerId);
}

export function getActiveAvatar(profile: CompanyProfile): Avatar | null {
  return findAvatar(profile, profile.active.avatarId);
}

export function isCompanyOnboarded(profile: CompanyProfile): boolean {
  return profile.companyName.trim().length > 0 && profile.offers.some((offer) => offer.status !== "archived");
}

export function formatActiveContextBrief(profile: CompanyProfile): string {
  const offer = getActiveOffer(profile);
  const avatar = getActiveAvatar(profile);
  const lines = [
    `Company: ${profile.companyName || "(unset)"}`,
    offer
      ? `Active offer (${offer.id}): ${offer.name} — ${offer.promise || offer.description || "(no promise)"}`
      : "Active offer: (not set)",
    avatar
      ? `Active avatar (${avatar.id}): ${avatar.name} — ${avatar.description || "(no description)"}`
      : "Active avatar: (not set)",
  ];
  if (offer?.pricePoint) lines.push(`Price point: ${offer.pricePoint}`);
  if (offer?.channel) lines.push(`Channel: ${offer.channel}`);
  return lines.join("\n");
}

function migrateLegacyFlatFields(
  profile: Partial<CompanyProfile> & LegacyCompanyProfileFields,
): Pick<CompanyProfile, "offers" | "avatars" | "active" | "brandPromise"> {
  const base = emptyCompanyProfile();
  let offers = profile.offers ?? base.offers;
  let avatars = profile.avatars ?? base.avatars;
  let active = profile.active ?? base.active;
  let brandPromise = profile.brandPromise ?? base.brandPromise;

  const legacyOffer = profile.offer?.trim();
  const legacyAvatar = profile.avatar?.trim();
  const legacyPromise = profile.promise?.trim();

  if (offers.length === 0 && legacyOffer) {
    const offerId = "primary-offer";
    const avatarId = "primary-avatar";
    offers = [
      {
        id: offerId,
        name: legacyOffer.slice(0, 80),
        description: legacyOffer,
        promise: legacyPromise ?? "",
        pricePoint: profile.pricePoint?.trim() ?? "",
        channel: profile.channel?.trim() ?? "",
        status: "active",
        targetAvatarIds: legacyAvatar ? [avatarId] : [],
        metrics: emptyMetrics(),
        updatedAt: nowIso(),
      },
    ];
    if (legacyAvatar) {
      avatars = [
        {
          id: avatarId,
          name: legacyAvatar.slice(0, 60),
          description: legacyAvatar,
          pains: [],
          desires: [],
          status: "active",
          updatedAt: nowIso(),
        },
      ];
    }
    active = { offerId, avatarId: legacyAvatar ? avatarId : null };
    if (legacyPromise && !brandPromise) {
      brandPromise = legacyPromise;
    }
  }

  return { offers, avatars, active, brandPromise };
}

export function normalizeCompanyProfile(
  profile: (Partial<CompanyProfile> & LegacyCompanyProfileFields) | null | undefined,
): CompanyProfile {
  const base = emptyCompanyProfile();
  if (!profile) {
    return base;
  }

  const migrated = migrateLegacyFlatFields(profile);

  return {
    ...base,
    ...profile,
    ...migrated,
    metrics: {
      ...base.metrics,
      ...(profile.metrics ?? {}),
    },
    goals: profile.goals ?? base.goals,
    researchSources: profile.researchSources ?? base.researchSources,
    offers: (migrated.offers ?? []).map((offer) => ({
      ...offer,
      metrics: { ...emptyMetrics(), ...offer.metrics },
      targetAvatarIds: offer.targetAvatarIds ?? [],
    })),
    avatars: migrated.avatars ?? [],
    active: {
      offerId: migrated.active?.offerId ?? null,
      avatarId: migrated.active?.avatarId ?? null,
    },
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

  const offerLines =
    normalized.offers.length > 0
      ? normalized.offers
          .map((offer) => {
            const activeMark = normalized.active.offerId === offer.id ? " *(active)*" : "";
            return `- **${offer.id}**${activeMark}: ${offer.name} (${offer.status}) — ${offer.pricePoint || "price TBD"}`;
          })
          .join("\n")
      : "- (none yet)";

  const avatarLines =
    normalized.avatars.length > 0
      ? normalized.avatars
          .map((avatar) => {
            const activeMark = normalized.active.avatarId === avatar.id ? " *(active)*" : "";
            return `- **${avatar.id}**${activeMark}: ${avatar.name} (${avatar.status})`;
          })
          .join("\n")
      : "- (none yet)";

  return `# Company Profile

> Shared company state for the Hormozi advisor. Catalogs plus active session context.

## Identity

- **Company:** ${normalized.companyName || "(unset)"}
- **Website:** ${normalized.websiteUrl || "(unset)"}
- **Brand promise:** ${normalized.brandPromise || "(unset)"}

## Active context

- **Offer id:** ${normalized.active.offerId ?? "(unset)"}
- **Avatar id:** ${normalized.active.avatarId ?? "(unset)"}

${formatActiveContextBrief(normalized)}

## Offers catalog

${offerLines}

## Avatars catalog

${avatarLines}

## Research

${normalized.researchNotes || "(none yet)"}

### Sources

${sources}

## Company metrics

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
