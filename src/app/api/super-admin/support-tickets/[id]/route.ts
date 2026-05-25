import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdminGate } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

/** Get a single support ticket (with message). */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireSuperAdminGate();
  if (!gate.ok) return gate.response;

  const { admin } = gate;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'Ticket id required' }, { status: 400 });
  }

  try {
    const { data: ticket, error } = await admin
      .from('support_tickets')
      .select('id, business_id, subject, message, priority, status, requester_email, assigned_to, created_at, updated_at')
      .eq('id', id)
      .single();

    if (error || !ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const { data: biz } = await admin.from('businesses').select('name').eq('id', (ticket as { business_id: string }).business_id).maybeSingle();
    const business_name = (biz as { name?: string } | null)?.name ?? '—';

    return NextResponse.json({
      ...ticket,
      business_name,
    });
  } catch (e) {
    console.error('Support ticket get error:', e);
    return NextResponse.json({ error: 'Failed to load ticket' }, { status: 500 });
  }
}

/** Update a support ticket. Body: { status?, assigned_to? }. */
export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireSuperAdminGate();
  if (!gate.ok) return gate.response;

  const { admin } = gate;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'Ticket id required' }, { status: 400 });
  }

  try {
    const body = await _request.json();
    const updates: { status?: string; assigned_to?: string; updated_at: string } = {
      updated_at: new Date().toISOString(),
    };
    if (body.status != null) {
      const s = body.status?.toString()?.toLowerCase();
      if (['open', 'in_progress', 'resolved', 'closed'].includes(s)) updates.status = s;
    }
    if (body.assigned_to !== undefined) {
      updates.assigned_to = body.assigned_to?.toString()?.trim() ?? null;
    }

    const { data: ticket, error } = await admin
      .from('support_tickets')
      .update(updates)
      .eq('id', id)
      .select('id, business_id, subject, message, priority, status, requester_email, assigned_to, created_at, updated_at')
      .single();

    if (error) {
      console.error('Support ticket update error:', error);
      return NextResponse.json({ error: 'Failed to update ticket' }, { status: 500 });
    }
    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }
    return NextResponse.json(ticket);
  } catch (e) {
    console.error('Support ticket update error:', e);
    return NextResponse.json({ error: 'Failed to update ticket' }, { status: 500 });
  }
}
