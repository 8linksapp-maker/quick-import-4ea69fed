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
    // 1. Get required data from the request
    const { site_id } = await req.json();
    if (!site_id) {
      throw new Error('Missing required field: site_id.');
    }

    // 2. Authenticate the user
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.split(' ')[1];
    const userId = getUserIdFromToken(token);
    if (!userId) {
      return new Response(JSON.stringify({ error: 'User not authenticated.' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 3. Create a Supabase client
    // We can use the user's client here since RLS is in place for SELECT
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    // 4. Fetch jobs from the article_jobs table
    const { data: jobs, error: selectError } = await supabase
      .from('article_jobs')
      .select('id, created_at, status, generated_title, error_message')
      .eq('site_id', site_id)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (selectError) {
      console.error('Error fetching article jobs:', selectError);
      throw new Error(`Failed to fetch article jobs: ${selectError.message}`);
    }

    // 5. Return the list of jobs
    return new Response(JSON.stringify(jobs), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in get-article-job-status:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
