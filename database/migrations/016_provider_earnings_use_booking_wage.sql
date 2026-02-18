-- ========================================
-- Use booking provider_wage in earnings calculation
-- ========================================
-- REQUIRES: 012 (provider_wage columns on bookings), 015 (service_id nullable)
-- This trigger uses the wage you set on the booking when you "Mark as Completed".
-- If no wage is set on the booking, it falls back to provider_pay_rates or 80/20 default.

DROP TRIGGER IF EXISTS trigger_calculate_provider_earnings ON public.bookings;

CREATE OR REPLACE FUNCTION calculate_provider_earnings()
RETURNS TRIGGER AS $$
DECLARE
  pay_rate RECORD;
  commission_amount numeric;
  net_amount numeric;
  pay_rate_type text;
  hours_worked numeric := 1;
  used_booking_wage boolean := false;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status = 'completed' AND OLD.status != 'completed' AND NEW.provider_id IS NOT NULL THEN
    
    -- Priority 1: Use wage set on this booking (requires migration 012)
    IF NEW.provider_wage IS NOT NULL AND NEW.provider_wage_type IS NOT NULL THEN
      used_booking_wage := true;
      pay_rate_type := NEW.provider_wage_type;
      
      IF NEW.provider_wage_type = 'percentage' THEN
        net_amount := COALESCE(NEW.total_price, 0) * (COALESCE(NEW.provider_wage, 0) / 100);
        commission_amount := COALESCE(NEW.total_price, 0) - net_amount;
      ELSIF NEW.provider_wage_type = 'fixed' THEN
        net_amount := COALESCE(NEW.provider_wage, 0);
        commission_amount := COALESCE(NEW.total_price, 0) - net_amount;
      ELSIF NEW.provider_wage_type = 'hourly' THEN
        hours_worked := 1;
        net_amount := COALESCE(NEW.provider_wage, 0) * hours_worked;
        commission_amount := COALESCE(NEW.total_price, 0) - net_amount;
      END IF;
    END IF;
    
    -- Priority 2: Fall back to provider default pay rate
    IF NOT used_booking_wage THEN
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
        pay_rate_type := 'percentage';
        commission_amount := COALESCE(NEW.total_price, 0) * 0.2;
        net_amount := COALESCE(NEW.total_price, 0) * 0.8;
      END IF;
    END IF;
    
    IF net_amount < 0 THEN net_amount := 0; END IF;
    IF commission_amount < 0 THEN commission_amount := 0; END IF;
    IF net_amount + commission_amount > COALESCE(NEW.total_price, 0) THEN
      net_amount := GREATEST(0, COALESCE(NEW.total_price, 0) - commission_amount);
    END IF;
    
    INSERT INTO public.provider_earnings (
      provider_id, booking_id, service_id, gross_amount,
      commission_rate, commission_amount, net_amount, pay_rate_type
    ) VALUES (
      NEW.provider_id, NEW.id, NEW.service_id, COALESCE(NEW.total_price, 0),
      NULL,
      commission_amount, net_amount, pay_rate_type
    );
    
    UPDATE public.service_providers 
    SET total_earned = COALESCE(total_earned, 0) + net_amount,
        current_balance = COALESCE(current_balance, 0) + net_amount,
        updated_at = NOW()
    WHERE id = NEW.provider_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_provider_earnings
  AFTER UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION calculate_provider_earnings();

COMMENT ON FUNCTION calculate_provider_earnings() IS 
'Uses booking provider_wage when set (run 012 first); else provider_pay_rates or 80/20 default. Inserts only minimal provider_earnings columns.';
