import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { siteId } = await req.json();

    if (!siteId) {
      throw new Error('Site ID is required.');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();

    if (!user) {
      throw new Error('User not authenticated.');
    }

    const { data: site, error: siteError } = await supabaseClient
      .from('wp_sites')
      .select('site_url, wp_username, encrypted_application_password')
      .eq('id', siteId)
      .single();

    if (siteError) throw siteError;
    if (!site) throw new Error('Site not found.');

    const applicationPassword = atob(site.encrypted_application_password);
    const authString = btoa(`${site.wp_username}:${applicationPassword}`);
    const wpApiUrl = `${site.site_url.replace(/\/?$/, '')}/wp-json/wp/v2/posts?status=any`;

    const wpResponse = await fetch(wpApiUrl, {
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/json',
      },
    });

    if (!wpResponse.ok) {
      const errorText = await wpResponse.text();
      throw new Error(`WordPress API request failed: ${wpResponse.status} - ${errorText}`);
    }

    const articles = await wpResponse.json();

    return new Response(JSON.stringify(articles), {
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
