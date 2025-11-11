import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { site_url, wp_username, application_password } = await req.json();

    if (!site_url || !wp_username || !application_password) {
      throw new Error('Site URL, WordPress username, and application password are required.');
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

    // 1. Validate credentials by trying to fetch user data from WordPress REST API
    const authString = btoa(`${wp_username}:${application_password}`);
    const wpApiUrl = `${site_url.replace(/\/?$/, '')}/wp-json/wp/v2/users/me`; // Ensure no trailing slash

    const wpResponse = await fetch(wpApiUrl, {
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/json',
      },
    });

    if (!wpResponse.ok) {
      const errorText = await wpResponse.text();
      throw new Error(`WordPress API authentication failed: ${wpResponse.status} - ${errorText}`);
    }

    // 2. Encrypt the application password before storing (simple base64 for now)
    const encrypted_application_password = btoa(application_password);

    // 3. Save to Supabase
    const { data, error } = await supabaseClient
      .from('wp_sites')
      .insert({
        user_id: user.id,
        site_url,
        wp_username,
        encrypted_application_password,
      })
      .select();

    if (error) {
      throw error;
    }

    return new Response(JSON.stringify({ message: 'WordPress site registered successfully!', site: data[0] }), {
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
