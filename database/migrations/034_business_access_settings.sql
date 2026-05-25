        -- Access settings messages shown when customer is blocked/deactivated or provider is deactivated
        CREATE TABLE IF NOT EXISTS public.business_access_settings (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
          customer_blocked_message text DEFAULT 'We apologize for the inconvenience. Please contact our office if you have any questions.',
          provider_deactivated_message text DEFAULT 'We apologize for the inconvenience. Please contact our office if you have any questions.',
          created_at timestamptz DEFAULT now(),
          updated_at timestamptz DEFAULT now(),
          UNIQUE(business_id)
        );

        CREATE INDEX IF NOT EXISTS idx_business_access_settings_business_id ON public.business_access_settings(business_id);

        COMMENT ON TABLE public.business_access_settings IS 'Messages shown when a customer or provider account is blocked/deactivated';
