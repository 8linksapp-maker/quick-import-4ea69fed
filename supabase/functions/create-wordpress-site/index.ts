import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log("--- create-wordpress-site function started ---");

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('CUSTOM_SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { vpsId, domain, user, pass, email } = await req.json();
    console.log("Received data:", { vpsId, domain, user, email }); // Don't log pass
    if (!vpsId || !domain || !user || !pass || !email) {
      throw new Error('vpsId, domain, user, pass, and email are required.');
    }

    const { data: credentials, error: credError } = await supabaseClient
      .from('vps_credentials')
      .select('host, port, username, encrypted_password')
      .eq('id', vpsId)
      .single();

    if (credError) {
      console.error("Error fetching VPS credentials:", credError);
      throw credError;
    }
    if (!credentials) {
      console.error("VPS credentials not found for vpsId:", vpsId);
      throw new Error('VPS credentials not found.');
    }
    console.log("Successfully fetched VPS credentials for host:", credentials.host);

    const sshServiceUrl = Deno.env.get('VERCEL_SSH_SERVICE_URL');
    console.log("VERCEL_SSH_SERVICE_URL:", sshServiceUrl); // Log the URL
    if (!sshServiceUrl) {
      throw new Error('VERCEL_SSH_SERVICE_URL is not set.');
    }

    const escapedPass = pass.replace(/'/g, "'\\''");
    const command = `sudo wo site create ${domain} --wp --user=${user} --pass='${escapedPass}' --email=${email} --le && sudo ufw allow 80/tcp && sudo ufw allow 443/tcp && sudo ufw reload && echo 'y' | sudo ufw enable`;
    console.log("Executing command:", command);

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

    console.log("Response status from ssh-service:", response.status);
    const responseData = await response.json();

    if (!response.ok) {
      console.error("Error from ssh-service:", responseData);
      // Return 200 but with error data inside the payload
      return new Response(JSON.stringify({ error: responseData }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    console.log("--- create-wordpress-site function finished successfully ---");
    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error("--- create-wordpress-site function failed ---");
    console.error("Error:", error.message);
    // Return 200 even for unexpected errors, with error info in payload
    return new Response(JSON.stringify({ error: { message: error.message } }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  }
});
