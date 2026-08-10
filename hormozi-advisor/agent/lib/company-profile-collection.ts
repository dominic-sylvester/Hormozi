import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { formatProfileMarkdown, normalizeCompanyProfile, type CompanyProfile } from "./company-state.js";
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

  // Eve dev/eval runs with cwd = hormozi-advisor; repo content lives one level up.
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
    const key = scopeKey(scope);
    const updatedAt = profile.updatedAt ?? new Date().toISOString();
    const jsonRel = `items/${key}.json`;
    const mdRel = `items/${key}.md`;

    await writeFile(profileJsonPath(key), `${JSON.stringify(profile, null, 2)}\n`, "utf8");
    await writeFile(profileMarkdownPath(key), formatProfileMarkdown(profile), "utf8");

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
    return profile;
  }
}

let collection: CompanyProfileCollection | undefined;

export function getCompanyProfileCollection(): CompanyProfileCollection {
  if (!collection) {
    collection = new FileCompanyProfileCollection();
  }
  return collection;
}
