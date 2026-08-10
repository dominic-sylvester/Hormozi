import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import type { CompanyScope } from "./tenant.js";

export function resolveContentRoot(): string {
  if (process.env.CONTENT_COLLECTIONS_ROOT) {
    return process.env.CONTENT_COLLECTIONS_ROOT;
  }
  return join(process.cwd(), "..", "content");
}

function slug(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "_") || "anonymous";
}

export function scopeKey(scope: CompanyScope): string {
  return `${slug(scope.tenantId)}__${slug(scope.userId)}__${slug(scope.companyId)}`;
}

export function collectionDir(collectionName: string): string {
  return join(resolveContentRoot(), collectionName);
}

export function scopedJsonPath(collectionName: string, scope: CompanyScope): string {
  return join(collectionDir(collectionName), "items", `${scopeKey(scope)}.json`);
}

export async function readScopedJson<T>(
  collectionName: string,
  scope: CompanyScope,
  fallback: T,
): Promise<T> {
  try {
    const raw = await readFile(scopedJsonPath(collectionName, scope), "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function writeScopedJson<T extends { updatedAt?: string | null }>(
  collectionName: string,
  scope: CompanyScope,
  data: T,
): Promise<T> {
  const dir = join(collectionDir(collectionName), "items");
  await mkdir(dir, { recursive: true });
  const payload = { ...data, updatedAt: new Date().toISOString() };
  await writeFile(scopedJsonPath(collectionName, scope), `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return payload;
}

export async function readTemplateJson<T>(collectionName: string, filename: string, fallback: T): Promise<T> {
  try {
    const raw = await readFile(join(collectionDir(collectionName), "templates", filename), "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function listTemplateFiles(collectionName: string): Promise<string[]> {
  try {
    const entries = await readdir(join(collectionDir(collectionName), "templates"));
    return entries.filter((entry) => entry.endsWith(".json"));
  } catch {
    return [];
  }
}

export async function ensureCollectionIndex(collectionName: string, description: string): Promise<void> {
  const dir = collectionDir(collectionName);
  await mkdir(join(dir, "items"), { recursive: true });
  await mkdir(join(dir, "templates"), { recursive: true });
  const indexPath = join(dir, "collection.json");
  try {
    await readFile(indexPath, "utf8");
  } catch {
    await writeFile(
      indexPath,
      `${JSON.stringify(
        {
          version: 1,
          collection: collectionName,
          description,
          updated_at: new Date().toISOString(),
        },
        null,
        2,
      )}\n`,
      "utf8",
    );
  }
}
