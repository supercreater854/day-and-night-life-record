CREATE TABLE IF NOT EXISTS public.daily_records (
  owner_id text NOT NULL
    DEFAULT (current_setting('request.jwt.claims', true)::jsonb ->> 'sub'),
  record_date date NOT NULL,
  record_data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_id, record_date),
  CONSTRAINT daily_records_owner_present CHECK (owner_id <> ''),
  CONSTRAINT daily_records_date_matches CHECK (
    record_data ? 'date' AND record_data ->> 'date' = record_date::text
  )
);

ALTER TABLE public.daily_records ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.daily_records FROM PUBLIC;
REVOKE ALL ON public.daily_records FROM anon;
REVOKE ALL ON public.daily_records FROM authenticated;
GRANT SELECT, INSERT, UPDATE ON public.daily_records TO authenticated;
GRANT ALL ON public.daily_records TO service_role;

DROP POLICY IF EXISTS daily_records_select_own ON public.daily_records;
CREATE POLICY daily_records_select_own ON public.daily_records
  FOR SELECT TO authenticated
  USING (owner_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub'));

DROP POLICY IF EXISTS daily_records_insert_own ON public.daily_records;
CREATE POLICY daily_records_insert_own ON public.daily_records
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub'));

DROP POLICY IF EXISTS daily_records_update_own ON public.daily_records;
CREATE POLICY daily_records_update_own ON public.daily_records
  FOR UPDATE TO authenticated
  USING (owner_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub'))
  WITH CHECK (owner_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'sub'));

COMMENT ON TABLE public.daily_records IS 'Day and Night account-scoped daily record sync';
