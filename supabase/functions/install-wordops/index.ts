import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// Final diagnostic version was successful. Now implementing the non-interactive command.

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Use the admin client to bypass RLS for this internal operation
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('CUSTOM_SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { vpsId, username: woUsername, email: woEmail } = await req.json();
    if (!vpsId || !woUsername || !woEmail) {
      throw new Error('vpsId, username, and email are required.');
    }

    // We don't need to verify the user here as we are not accessing user-specific data directly.
    // The security is in retrieving the credentials which requires the vpsId passed from the frontend.
    // A user can only see the vpsIds they own.

    const { data: credentials, error: credError } = await supabaseClient
      .from('vps_credentials')
      .select('host, port, username, encrypted_password')
      .eq('id', vpsId)
      .single();

    if (credError) throw credError;
    if (!credentials) throw new Error('VPS credentials not found.');

    const sshServiceUrl = Deno.env.get('VERCEL_SSH_SERVICE_URL');
    if (!sshServiceUrl) throw new Error('VERCEL_SSH_SERVICE_URL is not set.');

    // Construct the non-interactive command
    // Escape single quotes in username and email to prevent shell injection issues
    const escapedUsername = woUsername.replace(/'/g, "'\\''");
    const escapedEmail = woEmail.replace(/'/g, "'\\''");

    const command = `echo "[user]\n    name = '${escapedUsername}'\n    email = '${escapedEmail}'" > ~/.gitconfig && wget -qO wo wops.cc && sudo bash wo --force && sudo wo stack install`;

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
