CREATE TABLE IF NOT EXISTS leads (
  id SERIAL PRIMARY KEY,
  lead_id TEXT NOT NULL UNIQUE,
  site_id TEXT NOT NULL,
  created_by_user_id INTEGER REFERENCES users(id),
  assigned_to_user_id INTEGER REFERENCES users(id),
  lead_source_type TEXT NOT NULL DEFAULT 'manual',
  landing_page_path TEXT,
  source_path TEXT,
  utm_source TEXT,
  utm_campaign TEXT,
  utm_term TEXT,
  utm_medium TEXT,
  utm_content TEXT,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  preferred_contact_method TEXT DEFAULT 'unknown',
  service_line TEXT DEFAULT 'general_inquiry',
  form_type TEXT DEFAULT 'other',
  lead_status TEXT NOT NULL DEFAULT 'new',
  outcome TEXT NOT NULL DEFAULT 'unknown',
  outcome_date TIMESTAMP,
  no_signup_reason TEXT,
  no_signup_reason_detail TEXT,
  signup_type TEXT,
  appointment_date TIMESTAMP,
  last_contacted_at TIMESTAMP,
  contact_attempts_count INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leads_site_id ON leads(site_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(lead_status);
CREATE INDEX IF NOT EXISTS idx_leads_outcome ON leads(outcome);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to_user_id);
