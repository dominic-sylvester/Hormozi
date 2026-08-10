import type { ToolContext } from "eve/tools";

import { getCompanyProfileCollection } from "./company-profile-collection.js";
import {
  companyProfile,
  emptyMetrics,
  findAvatar,
  findOffer,
  formatProfileMarkdown,
  normalizeCompanyProfile,
  nowIso,
  slugifyId,
  type Avatar,
  type CompanyProfile,
  type CompanyMetrics,
  type Offer,
} from "./company-state.js";
import type { CompanyScope } from "./tenant.js";

export function mergeCompanyProfile(
  current: CompanyProfile,
  patch: Partial<
    Omit<CompanyProfile, "metrics" | "goals" | "researchSources" | "offers" | "avatars" | "active">
  > & {
    metrics?: Partial<CompanyMetrics>;
    goals?: string[];
    researchSources?: CompanyProfile["researchSources"];
  },
): CompanyProfile {
  const metrics: CompanyMetrics = {
    ...current.metrics,
    ...(patch.metrics ?? {}),
  };

  return normalizeCompanyProfile({
    ...current,
    ...patch,
    metrics,
    goals: patch.goals ?? current.goals,
    researchSources: patch.researchSources ?? current.researchSources,
    updatedAt: nowIso(),
  });
}

export async function hydrateCompanyProfile(scope: CompanyScope): Promise<void> {
  const stored = await getCompanyProfileCollection().get(scope);
  if (stored) {
    companyProfile.update(() => normalizeCompanyProfile(stored));
  }
}

export async function persistCompanyProfile(
  scope: CompanyScope,
  profile: CompanyProfile,
): Promise<void> {
  await getCompanyProfileCollection().put(scope, profile);
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

function upsertById<T extends { id: string }>(items: T[], next: T): T[] {
  const index = items.findIndex((item) => item.id === next.id);
  if (index >= 0) {
    const copy = [...items];
    copy[index] = next;
    return copy;
  }
  return [...items, next];
}

export function upsertOfferInProfile(
  current: CompanyProfile,
  input: Partial<Omit<Offer, "id" | "updatedAt" | "metrics" | "targetAvatarIds">> & {
    id?: string;
    metrics?: Partial<CompanyMetrics>;
    targetAvatarIds?: string[];
  },
): CompanyProfile {
  const id = slugifyId(input.id ?? input.name ?? "offer");
  const existing = findOffer(current, id);
  const nextOffer: Offer = {
    id,
    name: input.name ?? existing?.name ?? id,
    description: input.description ?? existing?.description ?? "",
    promise: input.promise ?? existing?.promise ?? "",
    pricePoint: input.pricePoint ?? existing?.pricePoint ?? "",
    channel: input.channel ?? existing?.channel ?? "",
    status: input.status ?? existing?.status ?? "active",
    targetAvatarIds: input.targetAvatarIds ?? existing?.targetAvatarIds ?? [],
    metrics: {
      ...emptyMetrics(),
      ...(existing?.metrics ?? {}),
      ...(input.metrics ?? {}),
    },
    updatedAt: nowIso(),
  };

  const offers = upsertById(current.offers, nextOffer);
  const active = {
    ...current.active,
    offerId: current.active.offerId ?? (nextOffer.status === "active" ? nextOffer.id : null),
  };

  return normalizeCompanyProfile({
    ...current,
    offers,
    active,
    updatedAt: nowIso(),
  });
}

export function upsertAvatarInProfile(
  current: CompanyProfile,
  input: Partial<Omit<Avatar, "id" | "updatedAt" | "pains" | "desires">> & {
    id?: string;
    pains?: string[];
    desires?: string[];
  },
): CompanyProfile {
  const id = slugifyId(input.id ?? input.name ?? "avatar");
  const existing = findAvatar(current, id);
  const nextAvatar: Avatar = {
    id,
    name: input.name ?? existing?.name ?? id,
    description: input.description ?? existing?.description ?? "",
    pains: input.pains ?? existing?.pains ?? [],
    desires: input.desires ?? existing?.desires ?? [],
    status: input.status ?? existing?.status ?? "active",
    updatedAt: nowIso(),
  };

  const avatars = upsertById(current.avatars, nextAvatar);
  const active = {
    ...current.active,
    avatarId: current.active.avatarId ?? (nextAvatar.status === "active" ? nextAvatar.id : null),
  };

  return normalizeCompanyProfile({
    ...current,
    avatars,
    active,
    updatedAt: nowIso(),
  });
}

export function setActiveContextInProfile(
  current: CompanyProfile,
  input: { offerId?: string | null; avatarId?: string | null },
): CompanyProfile {
  const offerId =
    input.offerId === undefined ? current.active.offerId : input.offerId;
  const avatarId =
    input.avatarId === undefined ? current.active.avatarId : input.avatarId;

  if (offerId && !findOffer(current, offerId)) {
    throw new Error(`Unknown offer id: ${offerId}`);
  }
  if (avatarId && !findAvatar(current, avatarId)) {
    throw new Error(`Unknown avatar id: ${avatarId}`);
  }

  return normalizeCompanyProfile({
    ...current,
    active: { offerId: offerId ?? null, avatarId: avatarId ?? null },
    updatedAt: nowIso(),
  });
}

export function archiveOfferInProfile(current: CompanyProfile, offerId: string): CompanyProfile {
  const offer = findOffer(current, offerId);
  if (!offer) {
    throw new Error(`Unknown offer id: ${offerId}`);
  }
  return upsertOfferInProfile(current, { ...offer, status: "archived" });
}

export function archiveAvatarInProfile(current: CompanyProfile, avatarId: string): CompanyProfile {
  const avatar = findAvatar(current, avatarId);
  if (!avatar) {
    throw new Error(`Unknown avatar id: ${avatarId}`);
  }
  return upsertAvatarInProfile(current, { ...avatar, status: "archived" });
}
