import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (_req) => {
  if (_req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Usando a mesma chave da função get-users para consistência
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('CUSTOM_SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data, error } = await supabaseClient.rpc('daily_user_signups', {
      start_date: thirtyDaysAgo.toISOString()
    });

    if (error) {
      // Log detalhado do erro no lado do servidor
      console.error("--- DETAILED RPC ERROR in get-daily-stats ---");
      console.error(error);
      console.error("---------------------------------------------");
      throw new Error(`RPC Error: ${error.message}. Check function logs on Supabase dashboard for details.`);
    }
    
    return new Response(JSON.stringify({ data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    // Log do erro geral antes de retornar
    console.error("--- OVERALL CATCH ERROR in get-daily-stats ---");
    console.error(error);
    console.error("----------------------------------------------");
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})