import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('CUSTOM_SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { prompt_type, prompt_text, is_default } = await req.json();
    if (!prompt_type || !prompt_text) {
      throw new Error('Missing required fields');
    }

    const { error: insertError } = await supabaseClient
      .from('prompts')
      .insert({
        prompt_type,
        prompt_text,
        is_default: is_default || false,
      });

    if (insertError) {
      throw insertError;
    }

    return new Response(JSON.stringify({ message: 'Prompt saved successfully!' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
