import { NextRequest, NextResponse } from 'next/server';
import { EmailService } from '@/lib/emailService';
import {
  requireAdminTenantContext,
  assertBusinessIdMatchesContext,
} from '@/lib/adminTenantContext';

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireAdminTenantContext(request);
    if (ctx instanceof NextResponse) return ctx;
    const { supabase, businessId } = ctx;

    const hinted =
      request.headers.get('x-business-id')?.trim() ||
      request.nextUrl.searchParams.get('business_id')?.trim() ||
      null;
    const mismatch = assertBusinessIdMatchesContext(hinted, businessId);
    if (mismatch) return mismatch;

    const { id } = await params;

    const { data: invoice, error: invError } = await supabase
      .from('invoices')
      .select(`
        *,
        invoice_bookings(amount, bookings(service, scheduled_date, total_price)),
        invoice_line_items(description, quantity, unit_price, amount)
      `)
      .eq('id', id)
      .eq('business_id', businessId)
      .single();

    if (invError || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const { data: customer } = await supabase
      .from('customers')
      .select('name, email')
      .eq('id', invoice.customer_id)
      .single();

    if (!customer?.email) {
      return NextResponse.json({ error: 'Customer has no email address' }, { status: 400 });
    }

    const { data: business } = await supabase
      .from('businesses')
      .select('name, website, logo_url, business_email, business_phone, currency')
      .eq('id', businessId)
      .single();

    let shareToken = invoice.share_token;
    if (!shareToken) {
      shareToken = crypto.randomUUID();
      await supabase
        .from('invoices')
        .update({ share_token: shareToken, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('business_id', businessId);
    }

    const viewUrl = `${baseUrl.replace(/\/$/, '')}/invoice/${shareToken}`;

    let lineSummary = '';
    if (invoice.invoice_bookings && invoice.invoice_bookings.length > 0) {
      const items = invoice.invoice_bookings.map((ib: any) => {
        const b = ib.bookings;
        return b ? `${b.service || 'Booking'}: $${Number(ib.amount || b.total_price || 0).toFixed(2)}` : null;
      }).filter(Boolean);
      lineSummary = items.length ? items.join('<br>') : '';
    } else if (invoice.invoice_line_items && invoice.invoice_line_items.length > 0) {
      const items = invoice.invoice_line_items.map((li: any) =>
        `${li.description} (${li.quantity} × $${Number(li.unit_price).toFixed(2)}): $${Number(li.amount).toFixed(2)}`
      );
      lineSummary = items.join('<br>');
    }

    const emailService = new EmailService();
    const sent = await emailService.sendInvoice({
      to: customer.email,
      customerName: customer.name || 'Customer',
      businessName: business?.name || 'Your Business',
      businessWebsite: business?.website || null,
      businessLogoUrl: business?.logo_url || null,
      supportEmail: business?.business_email || null,
      supportPhone: business?.business_phone || null,
      storeCurrency: business?.currency || null,
      invoiceNumber: invoice.invoice_number,
      totalAmount: Number(invoice.total_amount) || 0,
      dueDate: invoice.due_date || null,
      issueDate: invoice.issue_date,
      description: invoice.description,
      viewUrl,
      lineSummary: lineSummary || undefined,
    });

    if (!sent) {
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Invoice sent to customer' });
  } catch (e) {
    console.error('Send invoice error:', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
