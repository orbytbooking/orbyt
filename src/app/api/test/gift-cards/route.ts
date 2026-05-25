import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest) {
  try {
    console.log('Testing gift card instances table access...');
    
    // Test 1: Check if table exists
    const { data: instances, error: instancesError } = await supabaseAdmin
      .from('gift_card_instances')
      .select('count')
      .single();
    
    console.log('Instances result:', { instances, error: instancesError });
    
    // Test 2: Check if gift cards table exists
    const { data: giftCards, error: giftCardsError } = await supabaseAdmin
      .from('marketing_gift_cards')
      .select('count')
      .single();
    
    console.log('Gift cards result:', { giftCards, error: giftCardsError });
    
    // Test 3: Try to list instances
    const { data: listData, error: listError } = await supabaseAdmin
      .from('gift_card_instances')
      .select('*')
      .limit(5);
    
    console.log('List result:', { listData, error: listError });
    
    return NextResponse.json({ 
      message: 'Test completed',
      instances: instances,
      giftCards: giftCards,
      listData: listData,
      errors: {
        instancesError,
        giftCardsError,
        listError
      }
    });
    
  } catch (error: any) {
    console.error('Test error:', error);
    return NextResponse.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
}
