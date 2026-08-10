import pg from "pg";

import type { CompanyProfile } from "./company-state.js";
import type { CompanyScope } from "./tenant.js";

export interface CompanyStore {
  ensureSchema(): Promise<void>;
  get(scope: CompanyScope): Promise<CompanyProfile | null>;
  put(scope: CompanyScope, profile: CompanyProfile): Promise<CompanyProfile>;
}

class PostgresCompanyStore implements CompanyStore {
  private readonly pool: pg.Pool;

  constructor(connectionString: string) {
    this.pool = new pg.Pool({ connectionString });
  }

  async ensureSchema(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS company_profiles (
        tenant_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        company_id TEXT NOT NULL DEFAULT 'default',
        profile JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (tenant_id, user_id, company_id)
      )
    `);
  }

  async get(scope: CompanyScope): Promise<CompanyProfile | null> {
    const result = await this.pool.query<{ profile: CompanyProfile }>(
      `SELECT profile
       FROM company_profiles
       WHERE tenant_id = $1 AND user_id = $2 AND company_id = $3`,
      [scope.tenantId, scope.userId, scope.companyId],
    );
    return result.rows[0]?.profile ?? null;
  }

  async put(scope: CompanyScope, profile: CompanyProfile): Promise<CompanyProfile> {
    await this.pool.query(
      `INSERT INTO company_profiles (tenant_id, user_id, company_id, profile, updated_at)
       VALUES ($1, $2, $3, $4::jsonb, $5::timestamptz)
       ON CONFLICT (tenant_id, user_id, company_id)
       DO UPDATE SET profile = EXCLUDED.profile, updated_at = EXCLUDED.updated_at`,
      [
        scope.tenantId,
        scope.userId,
        scope.companyId,
        JSON.stringify(profile),
        profile.updatedAt ?? new Date().toISOString(),
      ],
    );
    return profile;
  }
}

let store: CompanyStore | null | undefined;

export function getCompanyStore(): CompanyStore | null {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    return null;
  }

  if (store === undefined) {
    store = new PostgresCompanyStore(connectionString);
  }

  return store;
}

export async function ensureCompanyStoreReady(): Promise<void> {
  const companyStore = getCompanyStore();
  if (companyStore) {
    await companyStore.ensureSchema();
  }
}
