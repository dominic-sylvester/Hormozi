import {
  emptySopStore,
  normalizeSopStore,
  nowIso,
  slugifyId,
  type Sop,
  type SopStore,
} from "./operating-state.js";
import { createActionItems } from "./action-items-service.js";
import {
  ensureCollectionIndex,
  listTemplateFiles,
  readScopedJson,
  readTemplateJson,
  writeScopedJson,
} from "./content-collection-store.js";
import type { CompanyScope } from "./tenant.js";

const COLLECTION = "sops";

export async function listSops(scope: CompanyScope): Promise<Sop[]> {
  await ensureCollectionIndex(COLLECTION, "Standard operating procedures keyed by tenant, user, and company.");
  const store = await ensureDefaultSops(scope);
  return store.items;
}

export async function getSop(scope: CompanyScope, id: string): Promise<Sop | null> {
  const store = await ensureDefaultSops(scope);
  return store.items.find((item) => item.id === id) ?? null;
}

export async function upsertSop(
  scope: CompanyScope,
  input: Omit<Sop, "updatedAt"> & { updatedAt?: string },
): Promise<Sop> {
  await ensureCollectionIndex(COLLECTION, "Standard operating procedures keyed by tenant, user, and company.");
  const store = normalizeSopStore(await readScopedJson(COLLECTION, scope, emptySopStore()));
  const next: Sop = {
    ...input,
    id: input.id || slugifyId(input.name),
    updatedAt: nowIso(),
  };
  const index = store.items.findIndex((item) => item.id === next.id);
  if (index >= 0) {
    store.items[index] = next;
  } else {
    store.items.push(next);
  }
  await writeScopedJson(COLLECTION, scope, store);
  return next;
}

export async function ensureDefaultSops(scope: CompanyScope): Promise<SopStore> {
  const store = normalizeSopStore(await readScopedJson(COLLECTION, scope, emptySopStore()));
  if (store.items.length > 0) {
    return store;
  }

  const templateFiles = await listTemplateFiles(COLLECTION);
  const seeded: Sop[] = [];
  for (const filename of templateFiles) {
    const template = await readTemplateJson<Sop | null>(COLLECTION, filename, null);
    if (template?.id && template.name) {
      seeded.push({ ...template, updatedAt: nowIso() });
    }
  }

  if (seeded.length === 0) {
    return store;
  }

  const nextStore: SopStore = { items: seeded, updatedAt: nowIso() };
  await writeScopedJson(COLLECTION, scope, nextStore);
  return nextStore;
}

export async function spawnActionItemsFromSop(
  scope: CompanyScope,
  sopId: string,
  options: { dueAt?: string | null; source?: string } = {},
): Promise<{ sop: Sop; createdCount: number }> {
  const sop = await getSop(scope, sopId);
  if (!sop) {
    throw new Error(`Unknown SOP: ${sopId}`);
  }

  const created = await createActionItems(
    scope,
    sop.steps.map((step) => ({
      title: step.title,
      description: step.instruction,
      owner: step.ownerRole,
      department: sop.department,
      source: options.source ?? `sop:${sop.id}`,
      sopId: sop.id,
      sopStepOrder: step.order,
      dueAt: options.dueAt ?? null,
    })),
  );

  return { sop, createdCount: created.length };
}

export async function getSopStore(scope: CompanyScope): Promise<SopStore> {
  await ensureCollectionIndex(COLLECTION, "Standard operating procedures keyed by tenant, user, and company.");
  return ensureDefaultSops(scope);
}
