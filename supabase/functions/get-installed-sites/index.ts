import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  console.log('--- get-installed-sites v2 (with logging) ---');

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('CUSTOM_SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { vpsId } = await req.json();
    if (!vpsId) throw new Error('vpsId is required.');
    console.log(`[DEBUG] vpsId: ${vpsId}`);

    const { data: credentials, error: credError } = await supabaseClient
      .from('vps_credentials')
      .select('host, port, username, encrypted_password')
      .eq('id', vpsId)
      .single();

    if (credError) throw credError;
    if (!credentials) throw new Error('VPS credentials not found.');
    console.log(`[DEBUG] Found credentials for host: ${credentials.host}`);

    const sshServiceUrl = Deno.env.get('VERCEL_SSH_SERVICE_URL');
    if (!sshServiceUrl) throw new Error('VERCEL_SSH_SERVICE_URL is not set.');

    const command = 'ls /etc/nginx/sites-available/';
    console.log(`[DEBUG] Executing command: "${command}"`);

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

    console.log(`[DEBUG] SSH service response status: ${response.status}`);
    
    const responseText = await response.text();
    console.log(`[DEBUG] SSH service response body (text): ${responseText}`);

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      console.error('[DEBUG] Failed to parse SSH service response as JSON.');
      throw new Error(`Invalid JSON response from SSH service: ${responseText}`);
    }

    if (!response.ok) {
      console.log(`[DEBUG] Response not OK. Returning empty sites list. Error from service:`, responseData.error);
      return new Response(JSON.stringify({ sites: [], error: responseData.error || 'Erro ao comunicar com o serviço SSH.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200, 
      });
    }

    if (responseData.exitCode !== 0) {
      console.log(`[DEBUG] Command failed on VPS. exitCode: ${responseData.exitCode}. stderr: ${responseData.stderr}`);
      return new Response(JSON.stringify({ sites: [], error: responseData.stderr || `Command failed with code ${responseData.exitCode}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200, 
      });
    }

    const sites = responseData.stdout.trim().split('\n').filter(Boolean);
    console.log(`[DEBUG] Successfully retrieved sites: ${JSON.stringify(sites)}`);

    return new Response(JSON.stringify({ sites }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error(`[DEBUG] CATCH BLOCK ERROR in get-installed-sites: ${error.message}`);
    return new Response(JSON.stringify({ sites: [], error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200, 
    });
  }
});