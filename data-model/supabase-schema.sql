-- Luumos — Initial Supabase Schema (v0.1)
-- Date: 2026-04-30
--
-- Notes:
-- - PostgreSQL 15+ (Supabase default)
-- - Use uuid v4 for all PKs (gen_random_uuid())
-- - All timestamps in UTC (timestamptz)
-- - DSG-relevant: every personally identifiable table has a deleted_at column for soft-delete
-- - Run via Supabase CLI migrations, NEVER edit this file directly in production

-- ============================================
-- USERS / LEADS
-- ============================================
-- A user is anyone who has interacted with the Job-Check or signed up for the newsletter.
-- email is the natural key; we don't ask for name in v1 to lower the friction.
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  email_confirmed_at timestamptz,                  -- double-opt-in timestamp; null = not confirmed
  newsletter_opt_in boolean default false,         -- did they tick the newsletter checkbox
  newsletter_opt_in_at timestamptz,                -- when did they opt in
  newsletter_unsubscribed_at timestamptz,          -- when did they unsubscribe (if at all)
  locale text default 'de-CH',                     -- 'de-CH' | 'fr-CH' | 'it-CH' (v1 = de-CH only)
  age_band text,                                   -- '40-44' | '45-49' | '50-54' | '55-59' | '60-64' — optional
  utm_source text,                                 -- attribution
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz                           -- soft-delete für DSG right-to-be-forgotten
);

create index idx_users_email on users (email);
create index idx_users_created_at on users (created_at);
create index idx_users_newsletter_opt_in on users (newsletter_opt_in) where newsletter_opt_in = true;

-- ============================================
-- ROLES (canonical job-title library)
-- ============================================
-- Grows over time. Initially seeded with ~50 common Swiss white-collar roles.
-- raw user inputs land in job_check_submissions.raw_role_input;
-- a periodic LLM-assisted job (NOT yet automated) merges aliases into canonical entries.
create table if not exists roles (
  id uuid primary key default gen_random_uuid(),
  canonical_name text unique not null,             -- z.B. 'Treuhänder/in'
  aliases text[] default '{}',                     -- ['Treuhänder', 'Mandatsleiter Treuhand', 'Sachbearbeiter Treuhand', ...]
  industry_tags text[] default '{}',               -- ['treuhand', 'finanz']
  ai_replaceable_score numeric(5,2),               -- 0–100, manuell oder durch Analyse gesetzt
  ai_replaceable_score_explanation text,           -- begründungstext, wird im Job-Check verwendet
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_roles_aliases on roles using gin (aliases);
create index idx_roles_industry_tags on roles using gin (industry_tags);

-- ============================================
-- COMPANIES (canonical company library)
-- ============================================
-- Same pattern as roles. Optional in the Job-Check form (user can skip).
create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  canonical_name text unique not null,
  aliases text[] default '{}',
  size_band text,                                  -- '1-10' | '11-50' | '51-250' | '251-1000' | '1000+'
  industry text,                                   -- frei, später kanonisiert
  swiss_canton text,                               -- 'ZH' | 'BE' | 'SG' | etc., optional
  website_domain text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_companies_aliases on companies using gin (aliases);

-- ============================================
-- JOB CHECK SUBMISSIONS
-- ============================================
-- Every Job-Check session creates one row. Stores both raw user input AND resolved canonical IDs
-- (resolved later by an Edge Function that does fuzzy matching / LLM lookup against roles + companies).
create table if not exists job_check_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,

  -- Raw user input (verbatim, for analytics + library-feed)
  raw_role_input text not null,                    -- z.B. "Sachbearbeiterin Treuhand"
  raw_company_input text,                          -- z.B. "BDO Schweiz"
  raw_industry_input text,                         -- z.B. "Treuhand / Wirtschaftsprüfung"
  raw_tasks_input jsonb,                           -- ["Lohnbuchhaltung", "MWST-Abrechnungen", ...]
  raw_current_ai_usage text not null,              -- 'noch_nie' | 'ein_paar_mal' | 'woechentlich' | 'taeglich'
  raw_employment_type text,                        -- 'angestellt' | 'selbstaendig' | 'fuehrung'
  raw_company_size text,                           -- '1-10' | '11-50' | etc.

  -- Resolved canonical references (filled async by Edge Function)
  resolved_role_id uuid references roles(id),
  resolved_company_id uuid references companies(id),
  resolution_status text default 'pending',        -- 'pending' | 'resolved' | 'failed' | 'manual'

  -- AI analysis output
  ai_output jsonb,                                 -- structured: see prompts/job-check-output-schema
  ai_model_used text,                              -- 'claude-opus-4-6' | 'gpt-5' | etc.
  ai_tokens_input int,
  ai_tokens_output int,
  ai_cost_chf numeric(10,4),
  ai_processing_ms int,

  -- Sharing
  shared_publicly boolean default false,
  share_token text unique,                         -- random URL-safe token for public-share links
  shared_at timestamptz,

  -- Lifecycle
  completed_at timestamptz,                        -- null = abandoned mid-flow
  created_at timestamptz default now()
);

create index idx_jcs_user_id on job_check_submissions (user_id);
create index idx_jcs_created_at on job_check_submissions (created_at);
create index idx_jcs_resolved_role on job_check_submissions (resolved_role_id);
create index idx_jcs_share_token on job_check_submissions (share_token) where share_token is not null;
create index idx_jcs_current_ai_usage on job_check_submissions (raw_current_ai_usage);  -- für Segmentierungs-Queries

-- ============================================
-- NEWSLETTER EVENTS (DSG audit trail)
-- ============================================
-- Required by DSG/UWG: every consent / unsubscribe action must be auditable.
-- Never delete from this table; deletion of personal data is handled via users.deleted_at.
create table if not exists newsletter_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  event_type text not null,                        -- 'opt_in_started' | 'opt_in_confirmed' | 'unsubscribe' | 'email_sent' | 'email_opened' | 'email_clicked'
  ip_address inet,                                 -- für DSG-Audit (Beweis der Einwilligung)
  user_agent text,
  metadata jsonb,                                  -- frei
  created_at timestamptz default now()
);

create index idx_newsletter_events_user_id on newsletter_events (user_id);
create index idx_newsletter_events_event_type on newsletter_events (event_type);

-- ============================================
-- ROW-LEVEL SECURITY
-- ============================================
-- v1 is server-rendered via Edge Functions, so anon/auth role policies are restrictive.
-- Lovable's Supabase client uses the anon key — limit it strictly.

alter table users enable row level security;
alter table job_check_submissions enable row level security;
alter table newsletter_events enable row level security;
alter table roles enable row level security;
alter table companies enable row level security;

-- TODO: define policies before going live
-- - users: anon can INSERT (signup), can SELECT only own row via session
-- - job_check_submissions: anon can INSERT, can SELECT own + public-shared rows by share_token
-- - newsletter_events: anon can INSERT specific event types only (opt_in_started)
-- - roles + companies: anon SELECT for autocomplete (read-only, public lookup data)
-- - admin role can SELECT everything for analytics/dashboards

-- ============================================
-- CONVENIENCE VIEWS (für Job-Carousel-Content)
-- ============================================
-- Wöchentliche Top-eingereichte Berufe — Quelle für LinkedIn-Carousels
create or replace view v_weekly_top_roles as
select
  r.canonical_name as role_name,
  count(*) as submission_count,
  date_trunc('week', jcs.created_at) as week_start
from job_check_submissions jcs
join roles r on r.id = jcs.resolved_role_id
where jcs.created_at >= now() - interval '8 weeks'
group by r.canonical_name, date_trunc('week', jcs.created_at)
order by week_start desc, submission_count desc;

-- View runs under the caller's permissions, NOT the creator's. This means
-- RLS on the underlying tables (job_check_submissions) is honored.
alter view v_weekly_top_roles set (security_invoker = true);

-- ============================================
-- TRIGGERS
-- ============================================
-- Auto-update updated_at columns
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Lock search_path to prevent function-hijacking via temp schema
alter function public.set_updated_at() set search_path = public, pg_catalog;

create trigger trg_users_updated_at before update on users
  for each row execute function set_updated_at();

create trigger trg_roles_updated_at before update on roles
  for each row execute function set_updated_at();

create trigger trg_companies_updated_at before update on companies
  for each row execute function set_updated_at();
