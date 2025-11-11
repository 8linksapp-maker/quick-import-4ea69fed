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

    // This command cats the log file, prints a separator, and then checks if the PID from the pidfile is running
    const command = `cat /tmp/${logFileName} 2>/dev/null; echo '---STATUS-SEPARATOR---'; if ps -p $(cat /tmp/${pidFileName} 2>/dev/null) > /dev/null; then echo "running"; else echo "finished"; fi`;

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

    if (!response.ok) {
        // This can happen if the files don't exist yet. Treat as running with no log.
        return new Response(JSON.stringify({ logContent: '', status: 'running' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });
    }

    const responseData = await response.json();
    const output = responseData.stdout.trim();
    const separator = '---STATUS-SEPARATOR---';
    const separatorIndex = output.lastIndexOf(separator);

    let logContent = '';
    let status = 'finished'; // Default to finished if separator is not found

    if (separatorIndex !== -1) {
        logContent = output.substring(0, separatorIndex).trim();
        status = output.substring(separatorIndex + separator.length).trim();
    }

    return new Response(JSON.stringify({ logContent, status }), {
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
