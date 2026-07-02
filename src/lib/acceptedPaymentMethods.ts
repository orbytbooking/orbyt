import type { SupabaseClient } from '@supabase/supabase-js';

export type AcceptedPaymentForms = {
  creditCard: boolean;
  cashCheck: boolean;
};

export const DEFAULT_ACCEPTED_PAYMENT_FORMS: AcceptedPaymentForms = {
  creditCard: true,
  cashCheck: false,
};

export function parseAcceptedPaymentForms(
  row:
    | {
        accepted_payment_credit_card?: boolean | null;
        accepted_payment_cash_check?: boolean | null;
      }
    | null
    | undefined,
): AcceptedPaymentForms {
  if (!row) return { ...DEFAULT_ACCEPTED_PAYMENT_FORMS };
  return {
    creditCard: row.accepted_payment_credit_card !== false,
    cashCheck: row.accepted_payment_cash_check === true,
  };
}

export function normalizeBookingPaymentMethod(body: Record<string, unknown>): 'online' | 'cash' {
  return body.paymentMethod === 'online' || body.payment_method === 'online' ? 'online' : 'cash';
}

export function assertBookingPaymentMethodAllowed(
  method: 'online' | 'cash',
  accepted: AcceptedPaymentForms,
): { ok: true } | { ok: false; error: string; code: string } {
  if (!accepted.creditCard && !accepted.cashCheck) {
    return {
      ok: false,
      code: 'PAYMENT_METHOD_NOT_ALLOWED',
      error: 'No payment methods are available for online booking. Please contact the business.',
    };
  }
  if (method === 'online' && !accepted.creditCard) {
    return {
      ok: false,
      code: 'PAYMENT_METHOD_NOT_ALLOWED',
      error: 'Credit/debit card payment is not available for this business.',
    };
  }
  if (method === 'cash' && !accepted.cashCheck) {
    return {
      ok: false,
      code: 'PAYMENT_METHOD_NOT_ALLOWED',
      error: 'Cash/check payment is not available for this business.',
    };
  }
  return { ok: true };
}

export async function loadAcceptedPaymentForms(
  supabase: SupabaseClient,
  businessId: string,
): Promise<AcceptedPaymentForms> {
  const { data, error } = await supabase
    .from('business_store_options')
    .select('accepted_payment_credit_card, accepted_payment_cash_check')
    .eq('business_id', businessId)
    .maybeSingle();

  if (error) {
    const message = String(error.message ?? '').toLowerCase();
    if (error.code === '42703' || message.includes('accepted_payment_')) {
      return { ...DEFAULT_ACCEPTED_PAYMENT_FORMS };
    }
    throw error;
  }

  return parseAcceptedPaymentForms(data);
}
