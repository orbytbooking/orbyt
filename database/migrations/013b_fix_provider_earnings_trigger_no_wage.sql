-- ========================================
-- TEMPORARY FIX: Provider Earnings Trigger Without Wage Columns
-- ========================================
-- Use this if migration 012 hasn't been run yet and you're getting
-- "record 'new' has no field 'provider_wage'" errors
-- 
-- After running migration 012, run migration 013 to get full provider_wage support

-- Drop existing trigger
DROP TRIGGER IF EXISTS trigger_calculate_provider_earnings ON public.bookings;

-- Create trigger function WITHOUT provider_wage references (works without migration 012)
CREATE OR REPLACE FUNCTION calculate_provider_earnings()
RETURNS TRIGGER AS $$
DECLARE
  pay_rate RECORD;
  commission_amount numeric;
  net_amount numeric;
  pay_rate_type text;
  hours_worked numeric := 1;
BEGIN
  -- When booking is completed, calculate provider earnings
  IF TG_OP = 'UPDATE' AND NEW.status = 'completed' AND OLD.status != 'completed' AND NEW.provider_id IS NOT NULL THEN
    
    -- Get provider's default pay rate from provider_pay_rates table
    SELECT * INTO pay_rate 
    FROM public.provider_pay_rates 
    WHERE provider_id = NEW.provider_id 
    AND (service_id IS NULL OR service_id = NEW.service_id)
    AND is_active = true
    ORDER BY service_id NULLS LAST
    LIMIT 1;
    
    IF pay_rate.id IS NOT NULL THEN
      pay_rate_type := pay_rate.rate_type;
      
      IF pay_rate.rate_type = 'flat' THEN
        net_amount := COALESCE(pay_rate.flat_rate, 0);
        commission_amount := COALESCE(NEW.total_price, 0) - net_amount;
      ELSIF pay_rate.rate_type = 'percentage' THEN
        net_amount := COALESCE(NEW.total_price, 0) * (COALESCE(pay_rate.percentage_rate, 0) / 100);
        commission_amount := COALESCE(NEW.total_price, 0) - net_amount;
      ELSIF pay_rate.rate_type = 'hourly' THEN
        hours_worked := 1;
        net_amount := COALESCE(pay_rate.hourly_rate, 0) * hours_worked;
        commission_amount := COALESCE(NEW.total_price, 0) - net_amount;
      END IF;
    ELSE
      -- Default 80/20 split if no pay rate configured
      pay_rate_type := 'percentage';
      commission_amount := COALESCE(NEW.total_price, 0) * 0.2;
      net_amount := COALESCE(NEW.total_price, 0) * 0.8;
    END IF;
    
    -- Ensure amounts are valid
    IF net_amount < 0 THEN net_amount := 0; END IF;
    IF commission_amount < 0 THEN commission_amount := 0; END IF;
    IF net_amount + commission_amount > COALESCE(NEW.total_price, 0) THEN
      net_amount := GREATEST(0, COALESCE(NEW.total_price, 0) - commission_amount);
    END IF;
    
    -- Create earnings record (only columns that exist in minimal provider_earnings schema)
    INSERT INTO public.provider_earnings (
      provider_id, 
      booking_id, 
      service_id, 
      gross_amount, 
      commission_rate, 
      commission_amount, 
      net_amount, 
      pay_rate_type
    ) VALUES (
      NEW.provider_id,
      NEW.id,
      NEW.service_id,
      COALESCE(NEW.total_price, 0),
      CASE WHEN pay_rate_type = 'percentage' AND pay_rate.id IS NOT NULL THEN pay_rate.percentage_rate ELSE NULL END,
      commission_amount,
      net_amount,
      pay_rate_type
    );
    
    -- Update provider totals
    UPDATE public.service_providers 
    SET 
      total_earned = COALESCE(total_earned, 0) + net_amount,
      current_balance = COALESCE(current_balance, 0) + net_amount,
      updated_at = NOW()
    WHERE id = NEW.provider_id;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER trigger_calculate_provider_earnings
  AFTER UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION calculate_provider_earnings();

COMMENT ON FUNCTION calculate_provider_earnings() IS 
'Temporary version without provider_wage support. Run migration 012 then 013 for full provider_wage features.';
