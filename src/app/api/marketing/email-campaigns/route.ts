import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const business_id = searchParams.get('business_id');

    if (!business_id) {
      return NextResponse.json({ error: 'Business ID is required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('email_campaigns')
      .select('*')
      .eq('business_id', business_id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching email campaigns:', error);
      return NextResponse.json({ error: 'Failed to fetch email campaigns' }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error in email campaigns GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { business_id, subject, body: campaignBody, template, recipients, sent_at } = body;

    if (!business_id || !subject || !campaignBody || !template) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create campaign in database first
    const { data: campaignData, error: campaignError } = await supabaseAdmin
      .from('email_campaigns')
      .insert({
        business_id,
        subject: subject.trim(),
        body: campaignBody.trim(),
        template,
        recipients: recipients || [],
        sent_at: sent_at || null,
      })
      .select()
      .single();

    if (campaignError) {
      console.error('Error creating email campaign:', campaignError);
      return NextResponse.json({ error: 'Failed to create email campaign' }, { status: 500 });
    }

    // If sent_at is provided, send actual emails
    if (sent_at && recipients && recipients.length > 0) {
      try {
        const fromEmail = process.env.RESEND_FROM_EMAIL;
        if (!fromEmail) {
          throw new Error('RESEND_FROM_EMAIL environment variable is not configured');
        }

        // Send emails to all recipients
        const emailPromises = recipients.map(async (recipient: string) => {
          try {
            console.log(`Processing email for recipient: ${recipient}`);
            
            // Personalize the email body if [Customer Name] placeholder exists
            let personalizedBody = campaignBody;
            let personalizedSubject = subject;
            
            // Try to get customer name for personalization
            try {
              const customer = await supabaseAdmin
                .from('customers')
                .select('name')
                .eq('email', recipient)
                .eq('business_id', business_id)
                .single();
                
              if (customer.data && customer.data.name) {
                personalizedBody = personalizedBody.replace(/\[Customer Name\]/g, customer.data.name);
                personalizedSubject = personalizedSubject.replace(/\[Customer Name\]/g, customer.data.name);
                console.log(`Found customer: ${customer.data.name} for email: ${recipient}`);
              } else {
                // Fallback to a friendly name if customer not found
                const friendlyName = recipient.split('@')[0];
                personalizedBody = personalizedBody.replace(/\[Customer Name\]/g, friendlyName);
                personalizedSubject = personalizedSubject.replace(/\[Customer Name\]/g, friendlyName);
                console.log(`Customer not found for email: ${recipient}, using fallback: ${friendlyName}`);
              }
            } catch (customerError) {
              console.log(`Customer lookup failed for ${recipient}:`, customerError);
              // Fallback to a friendly name if lookup fails
              const friendlyName = recipient.split('@')[0];
              personalizedBody = personalizedBody.replace(/\[Customer Name\]/g, friendlyName);
              personalizedSubject = personalizedSubject.replace(/\[Customer Name\]/g, friendlyName);
            }

            console.log(`Sending email to: ${recipient} with subject: ${personalizedSubject}`);
            
            return resend.emails.send({
              from: fromEmail,
              to: [recipient],
              subject: personalizedSubject,
              html: personalizedBody.replace(/\n/g, '<br />'), // Convert line breaks to HTML
            });
          } catch (error) {
            console.error(`Failed to process email for ${recipient}:`, error);
            throw error;
          }
        });

        const emailResults = await Promise.allSettled(emailPromises);
        
        // Check for any failed sends
        const failedSends = emailResults.filter(result => result.status === 'rejected');
        if (failedSends.length > 0) {
          console.error('Some emails failed to send:', failedSends);
          // Still return success but note the partial failure
          return NextResponse.json({ 
            data: campaignData,
            warning: `${failedSends.length} out of ${recipients.length} emails failed to send`
          });
        }

        console.log(`Successfully sent ${recipients.length} emails for campaign ${campaignData.id}`);
        
      } catch (emailError) {
        console.error('Error sending emails:', emailError);
        // Update campaign to mark as failed
        await supabaseAdmin
          .from('email_campaigns')
          .update({ 
            sent_at: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', campaignData.id);
          
        return NextResponse.json({ 
          error: 'Campaign created but emails failed to send',
          details: emailError instanceof Error ? emailError.message : 'Unknown error'
        }, { status: 500 });
      }
    }

    return NextResponse.json({ data: campaignData });
  } catch (error) {
    console.error('Error in email campaigns POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, business_id, subject, body: campaignBody, template, recipients, sent_at } = body;

    if (!id || !business_id) {
      return NextResponse.json({ error: 'Campaign ID and Business ID are required' }, { status: 400 });
    }

    const updateData: any = {};
    if (subject !== undefined) updateData.subject = subject.trim();
    if (campaignBody !== undefined) updateData.body = campaignBody.trim();
    if (template !== undefined) updateData.template = template;
    if (recipients !== undefined) updateData.recipients = recipients;
    if (sent_at !== undefined) updateData.sent_at = sent_at;
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from('email_campaigns')
      .update(updateData)
      .eq('id', id)
      .eq('business_id', business_id)
      .select()
      .single();

    if (error) {
      console.error('Error updating email campaign:', error);
      return NextResponse.json({ error: 'Failed to update email campaign' }, { status: 500 });
    }

    // If sent_at is being set now, send the emails
    if (sent_at && recipients && recipients.length > 0) {
      try {
        const fromEmail = process.env.RESEND_FROM_EMAIL;
        if (!fromEmail) {
          throw new Error('RESEND_FROM_EMAIL environment variable is not configured');
        }

        // Send emails to all recipients
        const emailPromises = recipients.map(async (recipient: string) => {
          try {
            console.log(`Processing email for recipient: ${recipient} (updated campaign)`);
            
            // Personalize the email body if [Customer Name] placeholder exists
            let personalizedBody = campaignBody || updateData.body;
            let personalizedSubject = subject || updateData.subject;
            
            // Try to get customer name for personalization
            try {
              const customer = await supabaseAdmin
                .from('customers')
                .select('name')
                .eq('email', recipient)
                .eq('business_id', business_id)
                .single();
                
              if (customer.data && customer.data.name) {
                personalizedBody = personalizedBody.replace(/\[Customer Name\]/g, customer.data.name);
                personalizedSubject = personalizedSubject.replace(/\[Customer Name\]/g, customer.data.name);
                console.log(`Found customer: ${customer.data.name} for email: ${recipient}`);
              } else {
                // Fallback to a friendly name if customer not found
                const friendlyName = recipient.split('@')[0];
                personalizedBody = personalizedBody.replace(/\[Customer Name\]/g, friendlyName);
                personalizedSubject = personalizedSubject.replace(/\[Customer Name\]/g, friendlyName);
                console.log(`Customer not found for email: ${recipient}, using fallback: ${friendlyName}`);
              }
            } catch (customerError) {
              console.log(`Customer lookup failed for ${recipient}:`, customerError);
              // Fallback to a friendly name if lookup fails
              const friendlyName = recipient.split('@')[0];
              personalizedBody = personalizedBody.replace(/\[Customer Name\]/g, friendlyName);
              personalizedSubject = personalizedSubject.replace(/\[Customer Name\]/g, friendlyName);
            }

            console.log(`Sending email to: ${recipient} with subject: ${personalizedSubject}`);
            
            return resend.emails.send({
              from: fromEmail,
              to: [recipient],
              subject: personalizedSubject,
              html: personalizedBody.replace(/\n/g, '<br />'), // Convert line breaks to HTML
            });
          } catch (error) {
            console.error(`Failed to process email for ${recipient}:`, error);
            throw error;
          }
        });

        const emailResults = await Promise.allSettled(emailPromises);
        
        // Check for any failed sends
        const failedSends = emailResults.filter(result => result.status === 'rejected');
        if (failedSends.length > 0) {
          console.error('Some emails failed to send:', failedSends);
          return NextResponse.json({ 
            data,
            warning: `${failedSends.length} out of ${recipients.length} emails failed to send`
          });
        }

        console.log(`Successfully sent ${recipients.length} emails for updated campaign ${id}`);
        
      } catch (emailError) {
        console.error('Error sending emails for updated campaign:', emailError);
        return NextResponse.json({ 
          error: 'Campaign updated but emails failed to send',
          details: emailError instanceof Error ? emailError.message : 'Unknown error'
        }, { status: 500 });
      }
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error in email campaigns PUT:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const business_id = searchParams.get('business_id');

    if (!id || !business_id) {
      return NextResponse.json({ error: 'Campaign ID and Business ID are required' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('email_campaigns')
      .delete()
      .eq('id', id)
      .eq('business_id', business_id);

    if (error) {
      console.error('Error deleting email campaign:', error);
      return NextResponse.json({ error: 'Failed to delete email campaign' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in email campaigns DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
