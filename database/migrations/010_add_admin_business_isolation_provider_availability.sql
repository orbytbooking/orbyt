-- Add admin RLS policies for provider availability with business isolation
-- This ensures admins can only access availability for providers in their business

-- Drop existing admin policy if it exists (to allow recreation)
DROP POLICY IF EXISTS "Admins can view provider availability for their business" ON public.provider_availability;

-- Admin policies for provider_availability table
-- Admins can view availability for providers in their business
-- This policy allows viewing through either:
-- 1. Direct business_id match (if business_id is set)
-- 2. Provider relationship (provider belongs to admin's business)
CREATE POLICY "Admins can view provider availability for their business" ON public.provider_availability
  FOR SELECT USING (
    -- Check if business_id matches admin's business
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
    OR
    -- Or check if provider belongs to admin's business (handles cases where business_id might be null)
    provider_id IN (
      SELECT sp.id FROM service_providers sp
      INNER JOIN businesses b ON sp.business_id = b.id
      WHERE b.owner_id = auth.uid()
    )
  );

-- Drop existing admin insert policy if it exists
DROP POLICY IF EXISTS "Admins can insert provider availability for their business" ON public.provider_availability;

CREATE POLICY "Admins can insert provider availability for their business" ON public.provider_availability
  FOR INSERT WITH CHECK (
    -- Provider must belong to admin's business
    provider_id IN (
      SELECT sp.id FROM service_providers sp
      INNER JOIN businesses b ON sp.business_id = b.id
      WHERE b.owner_id = auth.uid()
    )
    AND
    -- business_id must match provider's business_id (if set)
    (
      business_id IS NULL 
      OR business_id IN (
        SELECT business_id FROM service_providers WHERE id = provider_id
      )
    )
  );

-- Drop existing admin update policy if it exists
DROP POLICY IF EXISTS "Admins can update provider availability for their business" ON public.provider_availability;

CREATE POLICY "Admins can update provider availability for their business" ON public.provider_availability
  FOR UPDATE USING (
    -- Can update if business_id matches admin's business
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
    OR
    -- Or if provider belongs to admin's business
    provider_id IN (
      SELECT sp.id FROM service_providers sp
      INNER JOIN businesses b ON sp.business_id = b.id
      WHERE b.owner_id = auth.uid()
    )
  );

-- Drop existing admin delete policy if it exists
DROP POLICY IF EXISTS "Admins can delete provider availability for their business" ON public.provider_availability;

CREATE POLICY "Admins can delete provider availability for their business" ON public.provider_availability
  FOR DELETE USING (
    -- Can delete if business_id matches admin's business
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    )
    OR
    -- Or if provider belongs to admin's business
    provider_id IN (
      SELECT sp.id FROM service_providers sp
      INNER JOIN businesses b ON sp.business_id = b.id
      WHERE b.owner_id = auth.uid()
    )
  );

-- Admin policies for provider_availability_slots table
-- Since this table doesn't have business_id, we verify through provider_id -> service_providers -> business_id
-- Only create policies if the table exists

DO $$
BEGIN
  -- Check if provider_availability_slots table exists
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'provider_availability_slots'
  ) THEN
    -- Drop existing admin policies if they exist
    DROP POLICY IF EXISTS "Admins can view provider availability slots for their business" ON public.provider_availability_slots;
    DROP POLICY IF EXISTS "Admins can insert provider availability slots for their business" ON public.provider_availability_slots;
    DROP POLICY IF EXISTS "Admins can update provider availability slots for their business" ON public.provider_availability_slots;
    DROP POLICY IF EXISTS "Admins can delete provider availability slots for their business" ON public.provider_availability_slots;

    -- Create admin policies for provider_availability_slots
    EXECUTE '
      CREATE POLICY "Admins can view provider availability slots for their business" ON public.provider_availability_slots
        FOR SELECT USING (
          provider_id IN (
            SELECT sp.id FROM service_providers sp
            INNER JOIN businesses b ON sp.business_id = b.id
            WHERE b.owner_id = auth.uid()
          )
        );

      CREATE POLICY "Admins can insert provider availability slots for their business" ON public.provider_availability_slots
        FOR INSERT WITH CHECK (
          provider_id IN (
            SELECT sp.id FROM service_providers sp
            INNER JOIN businesses b ON sp.business_id = b.id
            WHERE b.owner_id = auth.uid()
          )
        );

      CREATE POLICY "Admins can update provider availability slots for their business" ON public.provider_availability_slots
        FOR UPDATE USING (
          provider_id IN (
            SELECT sp.id FROM service_providers sp
            INNER JOIN businesses b ON sp.business_id = b.id
            WHERE b.owner_id = auth.uid()
          )
        );

      CREATE POLICY "Admins can delete provider availability slots for their business" ON public.provider_availability_slots
        FOR DELETE USING (
          provider_id IN (
            SELECT sp.id FROM service_providers sp
            INNER JOIN businesses b ON sp.business_id = b.id
            WHERE b.owner_id = auth.uid()
          )
        );
    ';
  ELSE
    RAISE NOTICE 'Table provider_availability_slots does not exist. Skipping policies for this table.';
  END IF;
END $$;
