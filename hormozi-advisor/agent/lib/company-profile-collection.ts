import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import {
  formatProfileMarkdown,
  normalizeCompanyProfile,
  type CompanyListItem,
  type CompanyProfile,
} from "./company-state.js";
import type { CompanyScope } from "./tenant.js";

const COLLECTION_NAME = "company-profiles";

type CollectionIndex = {
  version: number;
  collection: string;
  description: string;
  updated_at: string;
  items: CollectionItem[];
};

type CollectionItem = {
  key: string;
  tenant_id: string;
  user_id: string;
  company_id: string;
  file: string;
  markdown: string;
  updated_at: string;
};

export interface CompanyProfileCollection {
  get(scope: CompanyScope): Promise<CompanyProfile | null>;
  put(scope: CompanyScope, profile: CompanyProfile): Promise<CompanyProfile>;
  list(scope: Pick<CompanyScope, "tenantId" | "userId">): Promise<CompanyListItem[]>;
}

function slug(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "_") || "anonymous";
}

export function scopeKey(scope: CompanyScope): string {
  return `${slug(scope.tenantId)}__${slug(scope.userId)}__${slug(scope.companyId)}`;
}

function resolveContentRoot(): string {
  if (process.env.CONTENT_COLLECTIONS_ROOT) {
    return process.env.CONTENT_COLLECTIONS_ROOT;
  }

  return join(process.cwd(), "..", "content");
}

function collectionDir(): string {
  return join(resolveContentRoot(), COLLECTION_NAME);
}

function itemsDir(): string {
  return join(collectionDir(), "items");
}

function collectionIndexPath(): string {
  return join(collectionDir(), "collection.json");
}

function profileJsonPath(key: string): string {
  return join(itemsDir(), `${key}.json`);
}

function profileMarkdownPath(key: string): string {
  return join(itemsDir(), `${key}.md`);
}

async function ensureCollectionLayout(): Promise<void> {
  await mkdir(itemsDir(), { recursive: true });
  try {
    await readFile(collectionIndexPath(), "utf8");
  } catch {
    const seed: CollectionIndex = {
      version: 1,
      collection: COLLECTION_NAME,
      description: "Persisted company profiles keyed by tenant, user, and company id.",
      updated_at: new Date().toISOString(),
      items: [],
    };
    await writeFile(collectionIndexPath(), `${JSON.stringify(seed, null, 2)}\n`, "utf8");
  }
}

async function readIndex(): Promise<CollectionIndex> {
  await ensureCollectionLayout();
  try {
    const raw = await readFile(collectionIndexPath(), "utf8");
    if (!raw.trim()) {
      throw new Error("empty collection index");
    }
    return JSON.parse(raw) as CollectionIndex;
  } catch {
    const seed: CollectionIndex = {
      version: 1,
      collection: COLLECTION_NAME,
      description: "Persisted company profiles keyed by tenant, user, and company id.",
      updated_at: new Date().toISOString(),
      items: [],
    };
    await writeIndex(seed);
    return seed;
  }
}

async function writeIndex(index: CollectionIndex): Promise<void> {
  index.updated_at = new Date().toISOString();
  await writeFile(collectionIndexPath(), `${JSON.stringify(index, null, 2)}\n`, "utf8");
}

class FileCompanyProfileCollection implements CompanyProfileCollection {
  async get(scope: CompanyScope): Promise<CompanyProfile | null> {
    const key = scopeKey(scope);
    try {
      const raw = await readFile(profileJsonPath(key), "utf8");
      return normalizeCompanyProfile(JSON.parse(raw) as Partial<CompanyProfile>);
    } catch {
      return null;
    }
  }

  async put(scope: CompanyScope, profile: CompanyProfile): Promise<CompanyProfile> {
    await ensureCollectionLayout();
    const normalized = normalizeCompanyProfile(profile);
    const key = scopeKey(scope);
    const updatedAt = normalized.updatedAt ?? new Date().toISOString();
    const jsonRel = `items/${key}.json`;
    const mdRel = `items/${key}.md`;

    await writeFile(profileJsonPath(key), `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
    await writeFile(profileMarkdownPath(key), formatProfileMarkdown(normalized), "utf8");

    const index = await readIndex();
    const item: CollectionItem = {
      key,
      tenant_id: scope.tenantId,
      user_id: scope.userId,
      company_id: scope.companyId,
      file: jsonRel,
      markdown: mdRel,
      updated_at: updatedAt,
    };
    const existing = index.items.findIndex((entry) => entry.key === key);
    if (existing >= 0) {
      index.items[existing] = item;
    } else {
      index.items.push(item);
    }
    await writeIndex(index);
    return normalized;
  }

  async list(scope: Pick<CompanyScope, "tenantId" | "userId">): Promise<CompanyListItem[]> {
    const index = await readIndex();
    const matches = index.items.filter(
      (item) => item.tenant_id === scope.tenantId && item.user_id === scope.userId,
    );

    const results: CompanyListItem[] = [];
    for (const item of matches) {
      const profile = await this.get({
        tenantId: scope.tenantId,
        userId: scope.userId,
        companyId: item.company_id,
      });
      if (!profile) continue;
      results.push({
        companyId: item.company_id,
        companyName: profile.companyName || item.company_id,
        websiteUrl: profile.websiteUrl,
        offerCount: profile.offers.filter((offer) => offer.status !== "archived").length,
        avatarCount: profile.avatars.filter((avatar) => avatar.status !== "archived").length,
        updatedAt: profile.updatedAt,
      });
    }

    return results.sort((a, b) => a.companyId.localeCompare(b.companyId));
  }
}

let collection: CompanyProfileCollection | undefined;

export function getCompanyProfileCollection(): CompanyProfileCollection {
  if (!collection) {
    collection = new FileCompanyProfileCollection();
  }
  return collection;
}
