-- Tenant staff RLS for admin modules (after 103_customers_rls_tenant_staff.sql).
-- Extends owner-only policies to active tenant_users with matching permissions JSON keys
-- (same semantics as src/lib/adminModulePermissions.ts: null/missing = allow, explicit false = deny).

CREATE OR REPLACE FUNCTION public.staff_admin_module_allowed(p jsonb, module_key text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT p IS NULL
    OR NOT (p ? module_key)
    OR lower(trim(both from (p->>module_key))) NOT IN ('false', 'f', '0', 'no', 'off', '');
$$;

CREATE OR REPLACE FUNCTION public.staff_customers_module_allowed(p jsonb)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT public.staff_admin_module_allowed(p, 'customers');
$$;

CREATE OR REPLACE FUNCTION public.tenant_can_access_business(p_business_id uuid, p_module text)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT p_business_id IN (
    SELECT b.id FROM public.businesses b WHERE b.owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.tenant_users tu
    WHERE tu.business_id = p_business_id
      AND tu.user_id = auth.uid()
      AND tu.is_active = true
      AND public.staff_admin_module_allowed(tu.permissions, p_module)
  );
$$;

CREATE OR REPLACE FUNCTION public.tenant_staff_sees_provider(p_provider_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.service_providers sp
    WHERE sp.id = p_provider_id
      AND public.tenant_can_access_business(sp.business_id, 'providers')
  );
$$;

-- ---------------------------------------------------------------------------
-- Website builder / tenant config (admin module: settings)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Businesses can view their own website configs" ON public.business_website_configs;
DROP POLICY IF EXISTS "Businesses can update their own website configs" ON public.business_website_configs;
DROP POLICY IF EXISTS "Businesses can insert their own website configs" ON public.business_website_configs;
DROP POLICY IF EXISTS "Businesses can delete their own website configs" ON public.business_website_configs;

CREATE POLICY "Businesses can view their own website configs" ON public.business_website_configs
  FOR SELECT USING (public.tenant_can_access_business(business_id, 'settings'));

CREATE POLICY "Businesses can update their own website configs" ON public.business_website_configs
  FOR UPDATE USING (public.tenant_can_access_business(business_id, 'settings'));

CREATE POLICY "Businesses can insert their own website configs" ON public.business_website_configs
  FOR INSERT WITH CHECK (public.tenant_can_access_business(business_id, 'settings'));

CREATE POLICY "Businesses can delete their own website configs" ON public.business_website_configs
  FOR DELETE USING (public.tenant_can_access_business(business_id, 'settings'));

-- ---------------------------------------------------------------------------
-- Provider availability (admin module: providers)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can view provider availability for their business" ON public.provider_availability;
CREATE POLICY "Admins can view provider availability for their business" ON public.provider_availability
  FOR SELECT USING (
    (business_id IS NOT NULL AND public.tenant_can_access_business(business_id, 'providers'))
    OR public.tenant_staff_sees_provider(provider_id)
  );

DROP POLICY IF EXISTS "Admins can insert provider availability for their business" ON public.provider_availability;
CREATE POLICY "Admins can insert provider availability for their business" ON public.provider_availability
  FOR INSERT WITH CHECK (
    provider_id IN (
      SELECT sp.id FROM public.service_providers sp
      WHERE public.tenant_can_access_business(sp.business_id, 'providers')
    )
    AND (
      business_id IS NULL
      OR business_id IN (
        SELECT sp2.business_id FROM public.service_providers sp2 WHERE sp2.id = provider_id
      )
    )
  );

DROP POLICY IF EXISTS "Admins can update provider availability for their business" ON public.provider_availability;
CREATE POLICY "Admins can update provider availability for their business" ON public.provider_availability
  FOR UPDATE USING (
    (business_id IS NOT NULL AND public.tenant_can_access_business(business_id, 'providers'))
    OR public.tenant_staff_sees_provider(provider_id)
  );

DROP POLICY IF EXISTS "Admins can delete provider availability for their business" ON public.provider_availability;
CREATE POLICY "Admins can delete provider availability for their business" ON public.provider_availability
  FOR DELETE USING (
    (business_id IS NOT NULL AND public.tenant_can_access_business(business_id, 'providers'))
    OR public.tenant_staff_sees_provider(provider_id)
  );

-- ---------------------------------------------------------------------------
-- Provider availability slots (admin module: providers)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.provider_availability_slots') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Admins can view provider availability slots for their business" ON public.provider_availability_slots;
    DROP POLICY IF EXISTS "Admins can insert provider availability slots for their business" ON public.provider_availability_slots;
    DROP POLICY IF EXISTS "Admins can update provider availability slots for their business" ON public.provider_availability_slots;
    DROP POLICY IF EXISTS "Admins can delete provider availability slots for their business" ON public.provider_availability_slots;

    CREATE POLICY "Admins can view provider availability slots for their business" ON public.provider_availability_slots
      FOR SELECT USING (public.tenant_staff_sees_provider(provider_id));

    CREATE POLICY "Admins can insert provider availability slots for their business" ON public.provider_availability_slots
      FOR INSERT WITH CHECK (public.tenant_staff_sees_provider(provider_id));

    CREATE POLICY "Admins can update provider availability slots for their business" ON public.provider_availability_slots
      FOR UPDATE USING (public.tenant_staff_sees_provider(provider_id));

    CREATE POLICY "Admins can delete provider availability slots for their business" ON public.provider_availability_slots
      FOR DELETE USING (public.tenant_staff_sees_provider(provider_id));
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Marketing scripts & campaigns (admin module: marketing)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.marketing_scripts') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Users can view their own business marketing scripts" ON public.marketing_scripts;
    DROP POLICY IF EXISTS "Users can insert their own business marketing scripts" ON public.marketing_scripts;
    DROP POLICY IF EXISTS "Users can update their own business marketing scripts" ON public.marketing_scripts;
    DROP POLICY IF EXISTS "Users can delete their own business marketing scripts" ON public.marketing_scripts;

    CREATE POLICY "Users can view their own business marketing scripts" ON public.marketing_scripts
      FOR SELECT USING (
        auth.uid() IS NOT NULL AND public.tenant_can_access_business(business_id, 'marketing')
      );
    CREATE POLICY "Users can insert their own business marketing scripts" ON public.marketing_scripts
      FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND public.tenant_can_access_business(business_id, 'marketing')
      );
    CREATE POLICY "Users can update their own business marketing scripts" ON public.marketing_scripts
      FOR UPDATE USING (
        auth.uid() IS NOT NULL AND public.tenant_can_access_business(business_id, 'marketing')
      );
    CREATE POLICY "Users can delete their own business marketing scripts" ON public.marketing_scripts
      FOR DELETE USING (
        auth.uid() IS NOT NULL AND public.tenant_can_access_business(business_id, 'marketing')
      );
  END IF;

  IF to_regclass('public.email_campaigns') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Users can view their own business email campaigns" ON public.email_campaigns;
    DROP POLICY IF EXISTS "Users can insert their own business email campaigns" ON public.email_campaigns;
    DROP POLICY IF EXISTS "Users can update their own business email campaigns" ON public.email_campaigns;
    DROP POLICY IF EXISTS "Users can delete their own business email campaigns" ON public.email_campaigns;

    CREATE POLICY "Users can view their own business email campaigns" ON public.email_campaigns
      FOR SELECT USING (
        auth.uid() IS NOT NULL AND public.tenant_can_access_business(business_id, 'marketing')
      );
    CREATE POLICY "Users can insert their own business email campaigns" ON public.email_campaigns
      FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND public.tenant_can_access_business(business_id, 'marketing')
      );
    CREATE POLICY "Users can update their own business email campaigns" ON public.email_campaigns
      FOR UPDATE USING (
        auth.uid() IS NOT NULL AND public.tenant_can_access_business(business_id, 'marketing')
      );
    CREATE POLICY "Users can delete their own business email campaigns" ON public.email_campaigns
      FOR DELETE USING (
        auth.uid() IS NOT NULL AND public.tenant_can_access_business(business_id, 'marketing')
      );
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Industry pricing config (admin module: settings)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.industry_exclude_parameter') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Users can view exclude parameters for their business" ON public.industry_exclude_parameter;
    DROP POLICY IF EXISTS "Users can insert exclude parameters for their business" ON public.industry_exclude_parameter;
    DROP POLICY IF EXISTS "Users can update exclude parameters for their business" ON public.industry_exclude_parameter;
    DROP POLICY IF EXISTS "Users can delete exclude parameters for their business" ON public.industry_exclude_parameter;

    CREATE POLICY "Users can view exclude parameters for their business" ON public.industry_exclude_parameter
      FOR SELECT USING (
        auth.uid() IS NOT NULL AND public.tenant_can_access_business(business_id, 'settings')
      );
    CREATE POLICY "Users can insert exclude parameters for their business" ON public.industry_exclude_parameter
      FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND public.tenant_can_access_business(business_id, 'settings')
      );
    CREATE POLICY "Users can update exclude parameters for their business" ON public.industry_exclude_parameter
      FOR UPDATE USING (
        auth.uid() IS NOT NULL AND public.tenant_can_access_business(business_id, 'settings')
      );
    CREATE POLICY "Users can delete exclude parameters for their business" ON public.industry_exclude_parameter
      FOR DELETE USING (
        auth.uid() IS NOT NULL AND public.tenant_can_access_business(business_id, 'settings')
      );
  END IF;

  IF to_regclass('public.industry_frequency') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Users can view frequencies for their business" ON public.industry_frequency;
    DROP POLICY IF EXISTS "Users can insert frequencies for their business" ON public.industry_frequency;
    DROP POLICY IF EXISTS "Users can update frequencies for their business" ON public.industry_frequency;
    DROP POLICY IF EXISTS "Users can delete frequencies for their business" ON public.industry_frequency;

    CREATE POLICY "Users can view frequencies for their business" ON public.industry_frequency
      FOR SELECT USING (
        auth.uid() IS NOT NULL AND public.tenant_can_access_business(business_id, 'settings')
      );
    CREATE POLICY "Users can insert frequencies for their business" ON public.industry_frequency
      FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND public.tenant_can_access_business(business_id, 'settings')
      );
    CREATE POLICY "Users can update frequencies for their business" ON public.industry_frequency
      FOR UPDATE USING (
        auth.uid() IS NOT NULL AND public.tenant_can_access_business(business_id, 'settings')
      );
    CREATE POLICY "Users can delete frequencies for their business" ON public.industry_frequency
      FOR DELETE USING (
        auth.uid() IS NOT NULL AND public.tenant_can_access_business(business_id, 'settings')
      );
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Gift cards (admin module: marketing)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.marketing_gift_cards') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Users can view their own business gift cards" ON public.marketing_gift_cards;
    DROP POLICY IF EXISTS "Users can insert their own business gift cards" ON public.marketing_gift_cards;
    DROP POLICY IF EXISTS "Users can update their own business gift cards" ON public.marketing_gift_cards;
    DROP POLICY IF EXISTS "Users can delete their own business gift cards" ON public.marketing_gift_cards;

    CREATE POLICY "Users can view their own business gift cards" ON public.marketing_gift_cards
      FOR SELECT USING (
        auth.uid() IS NOT NULL AND public.tenant_can_access_business(business_id, 'marketing')
      );
    CREATE POLICY "Users can insert their own business gift cards" ON public.marketing_gift_cards
      FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND public.tenant_can_access_business(business_id, 'marketing')
      );
    CREATE POLICY "Users can update their own business gift cards" ON public.marketing_gift_cards
      FOR UPDATE USING (
        auth.uid() IS NOT NULL AND public.tenant_can_access_business(business_id, 'marketing')
      );
    CREATE POLICY "Users can delete their own business gift cards" ON public.marketing_gift_cards
      FOR DELETE USING (
        auth.uid() IS NOT NULL AND public.tenant_can_access_business(business_id, 'marketing')
      );
  END IF;

  IF to_regclass('public.gift_card_instances') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Users can view their own business gift card instances" ON public.gift_card_instances;
    DROP POLICY IF EXISTS "Users can insert their own business gift card instances" ON public.gift_card_instances;
    DROP POLICY IF EXISTS "Users can update their own business gift card instances" ON public.gift_card_instances;
    DROP POLICY IF EXISTS "Users can delete their own business gift card instances" ON public.gift_card_instances;

    CREATE POLICY "Users can view their own business gift card instances" ON public.gift_card_instances
      FOR SELECT USING (
        auth.uid() IS NOT NULL AND public.tenant_can_access_business(business_id, 'marketing')
      );
    CREATE POLICY "Users can insert their own business gift card instances" ON public.gift_card_instances
      FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND public.tenant_can_access_business(business_id, 'marketing')
      );
    CREATE POLICY "Users can update their own business gift card instances" ON public.gift_card_instances
      FOR UPDATE USING (
        auth.uid() IS NOT NULL AND public.tenant_can_access_business(business_id, 'marketing')
      );
    CREATE POLICY "Users can delete their own business gift card instances" ON public.gift_card_instances
      FOR DELETE USING (
        auth.uid() IS NOT NULL AND public.tenant_can_access_business(business_id, 'marketing')
      );
  END IF;

  IF to_regclass('public.gift_card_transactions') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Users can view their own business gift card transactions" ON public.gift_card_transactions;
    DROP POLICY IF EXISTS "Users can insert their own business gift card transactions" ON public.gift_card_transactions;

    CREATE POLICY "Users can view their own business gift card transactions" ON public.gift_card_transactions
      FOR SELECT USING (
        auth.uid() IS NOT NULL AND public.tenant_can_access_business(business_id, 'marketing')
      );
    CREATE POLICY "Users can insert their own business gift card transactions" ON public.gift_card_transactions
      FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND public.tenant_can_access_business(business_id, 'marketing')
      );
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Website assets bucket: update/delete objects by business id in path (settings)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Business owners can update their website assets" ON storage.objects;
CREATE POLICY "Business owners can update their website assets" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'website-assets'
    AND public.tenant_can_access_business((split_part(name, '/', 3)::uuid), 'settings')
  );

DROP POLICY IF EXISTS "Business owners can delete their website assets" ON storage.objects;
CREATE POLICY "Business owners can delete their website assets" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'website-assets'
    AND public.tenant_can_access_business((split_part(name, '/', 3)::uuid), 'settings')
  );
