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

    const { vpsId, logFileName, pidFileName } = await req.json();
    if (!vpsId || !logFileName || !pidFileName) {
      throw new Error('vpsId, logFileName, and pidFileName are required.');
    }

    // Basic security checks
    if (!logFileName.startsWith('wo-action-') || logFileName.includes('/') || !pidFileName.startsWith('wo-action-') || pidFileName.includes('/')) {
      throw new Error('Invalid file names.');
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

    const command = `rm -f /tmp/${logFileName} /tmp/${pidFileName}`;

    await fetch(`${sshServiceUrl}/execute`, {
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

    return new Response(JSON.stringify({ message: 'Log files cleaned up.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    // We don't want to throw a big error to the user if cleanup fails
    console.error('Log cleanup failed:', error.message);
    return new Response(JSON.stringify({ message: 'Cleanup failed but action may have succeeded.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200, // Return 200 so it doesn't show as an error to the user
    });
  }
});
