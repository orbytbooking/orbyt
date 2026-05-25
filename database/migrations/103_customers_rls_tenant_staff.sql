-- Staff / tenant_users could not see customers: RLS only allowed business owners.
-- Align with booking access: active tenant_users for the same business_id, respecting
-- tenant_users.permissions.customers (null = full access, false = deny).

CREATE OR REPLACE FUNCTION public.staff_customers_module_allowed(p jsonb)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT p IS NULL
    OR NOT (p ? 'customers')
    OR lower(trim(both from (p->>'customers'))) NOT IN ('false', 'f', '0', 'no', 'off', '');
$$;

DROP POLICY IF EXISTS "Business owners can view their customers" ON public.customers;
CREATE POLICY "Business owners can view their customers"
ON public.customers
FOR SELECT
USING (
  business_id IN (
    SELECT id FROM public.businesses WHERE owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.tenant_users tu
    WHERE tu.business_id = customers.business_id
      AND tu.user_id = auth.uid()
      AND tu.is_active = true
      AND staff_customers_module_allowed(tu.permissions)
  )
);

DROP POLICY IF EXISTS "Business owners can insert customers" ON public.customers;
CREATE POLICY "Business owners can insert customers"
ON public.customers
FOR INSERT
WITH CHECK (
  business_id IN (
    SELECT id FROM public.businesses WHERE owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.tenant_users tu
    WHERE tu.business_id = customers.business_id
      AND tu.user_id = auth.uid()
      AND tu.is_active = true
      AND staff_customers_module_allowed(tu.permissions)
  )
);

DROP POLICY IF EXISTS "Business owners can update their customers" ON public.customers;
CREATE POLICY "Business owners can update their customers"
ON public.customers
FOR UPDATE
USING (
  business_id IN (
    SELECT id FROM public.businesses WHERE owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.tenant_users tu
    WHERE tu.business_id = customers.business_id
      AND tu.user_id = auth.uid()
      AND tu.is_active = true
      AND staff_customers_module_allowed(tu.permissions)
  )
);

DROP POLICY IF EXISTS "Business owners can delete their customers" ON public.customers;
CREATE POLICY "Business owners can delete their customers"
ON public.customers
FOR DELETE
USING (
  business_id IN (
    SELECT id FROM public.businesses WHERE owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.tenant_users tu
    WHERE tu.business_id = customers.business_id AND tu.user_id = auth.uid()
      AND tu.is_active = true
      AND staff_customers_module_allowed(tu.permissions)
  )
);
