import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// Final diagnostic version was successful. Now implementing the non-interactive command.

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('CUSTOM_SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { vpsId, username: woUsername, email: woEmail } = await req.json();
    if (!vpsId || !woUsername || !woEmail) {
      throw new Error('vpsId, username, and email are required.');
    }

    const { data: credentials, error: credError } = await supabaseClient
      .from('vps_credentials')
      .select('host, port, username, encrypted_password')
      .eq('id', vpsId)
      .single();

    if (credError) throw credError;
    if (!credentials) throw new Error('VPS credentials not found.');

    const sshServiceUrl = Deno.env.get('VERCEL_SSH_SERVICE_URL');
    if (!sshServiceUrl) throw new Error('VERCEL_SSH_SERVICE_URL is not set.');

    const escapedUsername = woUsername.replace(/'/g, "'\\''");
    const escapedEmail = woEmail.replace(/'/g, "'\\''");
    // FIX: Replaced old, failing wops.cc installer with a robust, manual repository setup.
    const command = `sudo apt-get update -y && sudo apt-get install -y curl gnupg ca-certificates && \
wget -qO - https://repo.wordops.net/wopkgs.key | sudo gpg --dearmor -o /usr/share/keyrings/wordops.gpg && \
echo "deb [signed-by=/usr/share/keyrings/wordops.gpg] https://repo.wordops.net/debian/ bookworm main" | sudo tee /etc/apt/sources.list.d/wordops.list > /dev/null && \
sudo apt-get update -y && \
echo "[user]\n    name = '${escapedUsername}'\n    email = '${escapedEmail}'" > ~/.gitconfig && \
sudo apt-get install -y wordops && sudo wo stack install --force`;

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

    const responseData = await response.json();

    if (!response.ok) {
      return new Response(JSON.stringify({ error: responseData }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: { message: error.message } }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  }
});