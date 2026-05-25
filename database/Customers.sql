create table public.customers (
  id uuid not null default gen_random_uuid (),
  email character varying not null,
  name character varying not null,
  phone character varying null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  business_id uuid not null,
  address text null,
  join_date timestamp with time zone null default now(),
  total_bookings integer null default 0,
  total_spent numeric null default 0.00,
  status text null default 'active'::text,
  last_booking timestamp with time zone null,
  auth_user_id uuid null,
  avatar text null,
  email_notifications boolean null default true,
  sms_notifications boolean null default true,
  push_notifications boolean null default true,
  tags text[] null default '{}'::text[],
  access_blocked boolean null default false,
  booking_blocked boolean null default false,
  company text null,
  first_name character varying null,
  last_name character varying null,
  gender character varying null default 'unspecified'::character varying,
  notes text null,
  sms_reminders boolean null default true,
  billing_cards jsonb null default '[]'::jsonb,
  stripe_customer_id text null,
  constraint customers_pkey primary key (id),
  constraint customers_email_business_id_unique unique (email, business_id),
  constraint customers_auth_user_fkey foreign KEY (auth_user_id) references auth.users (id),
  constraint customers_business_id_fkey foreign KEY (business_id) references businesses (id),
  constraint customers_status_check check (
    (
      status = any (array['active'::text, 'inactive'::text])
    )
  )
) TABLESPACE pg_default;

create unique INDEX IF not exists idx_customers_email_business_unique on public.customers using btree (email, business_id) TABLESPACE pg_default;

create unique INDEX IF not exists idx_customers_auth_user_business_unique on public.customers using btree (auth_user_id, business_id) TABLESPACE pg_default
where
  (auth_user_id is not null);

create index IF not exists idx_customers_auth_user_id on public.customers using btree (auth_user_id) TABLESPACE pg_default;

create index IF not exists idx_customers_email on public.customers using btree (email) TABLESPACE pg_default;