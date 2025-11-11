import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { decode } from 'https://deno.land/x/djwt@v2.2/mod.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('CUSTOM_SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization')!;
    const [_, token] = authHeader.split(' ');
    const userId = decode(token)[1].sub;
    if (!userId) throw new Error('User ID not found in token.');

    const { vpsId, domain } = await req.json();
    if (!vpsId || !domain) throw new Error('vpsId and domain are required.');

    const { data: credentials, error: credError } = await supabaseClient
      .from('vps_credentials')
      .select('host, port, username, encrypted_password')
      .eq('user_id', userId)
      .eq('id', vpsId)
      .single();
    if (credError) throw credError;

    const sshServiceUrl = Deno.env.get('VERCEL_SSH_SERVICE_URL');
    if (!sshServiceUrl) throw new Error('VERCEL_SSH_SERVICE_URL is not set.');

    const command = `sudo wo site update ${domain} --letsencrypt`;

    const response = await fetch(`${sshServiceUrl}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        host: credentials.host,
        port: credentials.port,
        username: credentials.username,
        password: credentials.encrypted_password,
        command: command,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Proxy service returned an error.');
    }

    const responseData = await response.json();
    return new Response(JSON.stringify(responseData), {
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
