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

    const { vpsId } = await req.json();
    if (!vpsId) throw new Error('vpsId is required.');

    const { data: credentials, error: credError } = await supabaseClient
      .from('vps_credentials')
      .select('host, port, username, encrypted_password')
      .eq('id', vpsId)
      .single();

    if (credError) throw credError;
    if (!credentials) throw new Error('VPS credentials not found.');

    const sshServiceUrl = Deno.env.get('VERCEL_SSH_SERVICE_URL');
    if (!sshServiceUrl) throw new Error('VERCEL_SSH_SERVICE_URL is not set.');

    const command = 'command -v wo'; // Check for the existence of the 'wo' command

    const response = await fetch(`${sshServiceUrl}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        host: credentials.host,
        port: credentials.port,
        username: credentials.username,
        password: credentials.encrypted_password,
        command: command,
        wait_for_output: true
      }),
    });

    // If the command executes successfully (exit code 0), it means 'wo' exists.
    const installed = response.ok;

    return new Response(JSON.stringify({ installed }), {
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
