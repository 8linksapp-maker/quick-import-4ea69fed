import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { decode } from 'https://deno.land/x/djwt@v2.2/mod.ts';

// Helper to get user ID from JWT
const getUserIdFromToken = (token: string) => {
  try {
    const [_, payload] = decode(token);
    return payload?.sub || null;
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { job_id } = await req.json();
    if (!job_id) {
      throw new Error('Missing required field: job_id.');
    }

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.split(' ')[1];
    const userId = getUserIdFromToken(token);
    if (!userId) {
      return new Response(JSON.stringify({ error: 'User not authenticated.' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('CUSTOM_SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Update the job status to 'cancelled'
    // We also check that the job belongs to the user for security, even though we use service key.
    const { data, error } = await supabaseAdmin
      .from('article_jobs')
      .update({ status: 'cancelled', error_message: 'Job cancelled by user.' })
      .eq('id', job_id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to cancel job: ${error.message}`);
    }
    
    if (!data) {
        throw new Error('Job not found or access denied.');
    }

    return new Response(JSON.stringify({ message: 'Job cancelled successfully.', job: data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in cancel-article-job:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
