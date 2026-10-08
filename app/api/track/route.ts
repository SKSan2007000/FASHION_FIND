import { NextResponse } from 'next/server'; import { supabase } from '../../../lib/supabase';
export async function POST(req:Request){try{const body=await req.json(); if(supabase){await supabase.from('site_events').insert({event_type:body.type||'visit',product_id:body.productId||null});} return NextResponse.json({ok:true});}catch{return NextResponse.json({ok:false},{status:200})}}
