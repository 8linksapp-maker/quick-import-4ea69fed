import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  console.log('--- check-wordops-installed v4 (final logic) ---');

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

    const command = 'wo --version'; 
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
      console.error('[DEBUG] Failed to parse SSH service response as JSON. Raw response:', responseText);
      // If SSH service doesn't return JSON, it's an unexpected error, so WordOps is not installed.
      return new Response(JSON.stringify({ installed: false, error: 'Unexpected response from SSH service.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // If SSH service returns non-200 (e.g., 500 for command failure)
    if (!response.ok) {
        // This is the EXPECTED path when 'wo --version' is not found (exitCode 127 from SSH service)
        // or other command-related failure. It means WordOps is NOT installed.
        console.log(`[DEBUG] Command failed (HTTP ${response.status}). Treating as not installed. exitCode: ${responseData.exitCode}`);
        return new Response(JSON.stringify({ installed: false }), { // Return false, NO error message for this expected scenario
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });
    }

    // If SSH service returns 200 OK, check its internal exitCode
    const installed = responseData.exitCode === 0;
    console.log(`[DEBUG] Command succeeded (HTTP 200). Parsed exitCode: ${responseData.exitCode}. Determined installed: ${installed}`);

    return new Response(JSON.stringify({ installed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error(`[DEBUG] CATCH BLOCK ERROR in check-wordops-installed: ${error.message}`);
    // For any other unexpected errors, return installed: false with the error message.
    return new Response(JSON.stringify({ installed: false, error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200, 
    });
  }
});
