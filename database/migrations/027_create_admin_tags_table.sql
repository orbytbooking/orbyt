-- Tag definitions for admin General > Tags (ID, Name, Display Order per business)
-- Sequence for generating incrementing tag IDs
CREATE SEQUENCE IF NOT EXISTS public.general_tags_id_seq START WITH 1;

-- Function to generate TG-{number} format IDs
CREATE OR REPLACE FUNCTION public.generate_general_tag_id()
RETURNS text AS $$
DECLARE
  next_num integer;
  tag_id text;
BEGIN
  next_num := nextval('public.general_tags_id_seq');
  tag_id := 'TG-' || LPAD(next_num::text, 2, '0');
  RETURN tag_id;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS public.general_tags (
  id text NOT NULL DEFAULT public.generate_general_tag_id(),
  business_id uuid NOT NULL,
  name text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT general_tags_pkey PRIMARY KEY (id),
  CONSTRAINT general_tags_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_general_tags_business_id ON public.general_tags (business_id);
CREATE INDEX IF NOT EXISTS idx_general_tags_display_order ON public.general_tags (business_id, display_order);

COMMENT ON TABLE public.general_tags IS 'Tag definitions for admin General settings; used for labeling customers/providers';
