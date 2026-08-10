CREATE TABLE IF NOT EXISTS company_profiles (
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  company_id TEXT NOT NULL DEFAULT 'default',
  profile JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, user_id, company_id)
);
