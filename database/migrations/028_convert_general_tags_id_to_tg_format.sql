-- Convert general_tags.id from UUID to TG-01, TG-02 format (for tables created before 027 was updated)
-- Safe to run: only alters table if id column is uuid type.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'general_tags' AND column_name = 'id'
  ) AND (
    SELECT data_type FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'general_tags' AND column_name = 'id'
  ) = 'uuid' THEN
    -- Ensure sequence and function exist
    CREATE SEQUENCE IF NOT EXISTS public.general_tags_id_seq START WITH 1;
    CREATE OR REPLACE FUNCTION public.generate_general_tag_id()
    RETURNS text AS $fn$
    DECLARE
      next_num integer;
      tag_id text;
    BEGIN
      next_num := nextval('public.general_tags_id_seq');
      tag_id := 'TG-' || LPAD(next_num::text, 2, '0');
      RETURN tag_id;
    END;
    $fn$ LANGUAGE plpgsql;

    -- Add new text id column and backfill by display_order then created_at
    ALTER TABLE public.general_tags ADD COLUMN IF NOT EXISTS id_new text;
    WITH ordered AS (
      SELECT id AS old_id,
             'TG-' || LPAD(row_number() OVER (ORDER BY display_order, created_at)::text, 2, '0') AS new_id
      FROM public.general_tags
    )
    UPDATE public.general_tags g
    SET id_new = o.new_id
    FROM ordered o
    WHERE g.id = o.old_id;

    -- Set sequence so next insert gets the next number
    PERFORM setval('public.general_tags_id_seq',
      COALESCE((SELECT max(CAST(substring(id_new FROM 4) AS integer)) FROM public.general_tags), 0));

    -- Switch primary key to new column
    ALTER TABLE public.general_tags DROP CONSTRAINT IF EXISTS general_tags_pkey;
    ALTER TABLE public.general_tags DROP COLUMN id;
    ALTER TABLE public.general_tags RENAME COLUMN id_new TO id;
    ALTER TABLE public.general_tags ADD PRIMARY KEY (id);
    ALTER TABLE public.general_tags ALTER COLUMN id SET DEFAULT public.generate_general_tag_id();
  END IF;
END $$;
