import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  let checkpoint = 'start';
  try {
    checkpoint = 'creating-supabase-client';
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('CUSTOM_SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    checkpoint = 'parsing-request-body';
    const { vpsId } = await req.json();
    if (!vpsId) {
      throw new Error('vpsId is required.');
    }

    checkpoint = 'fetching-credentials';
    const { data: credentials, error: credError } = await supabaseClient
      .from('vps_credentials')
      .select('host, port, username, encrypted_password')
      .eq('id', vpsId)
      .single();

    if (credError) throw credError;
    if (!credentials) throw new Error('VPS credentials not found.');

    checkpoint = 'getting-env-var';
    const sshServiceUrl = Deno.env.get('VERCEL_SSH_SERVICE_URL');
    if (!sshServiceUrl) throw new Error('VERCEL_SSH_SERVICE_URL is not set.');

    checkpoint = 'defining-command';
    const command = `
      COMMAND_SITES="ls -1 /etc/nginx/sites-available/ | grep -v 'default' | wc -l";
      COMMAND_CPU="grep -c ^processor /proc/cpuinfo";
      COMMAND_RAM="cat /proc/meminfo | grep MemTotal | awk '{print $2}'";
      COMMAND_STORAGE="df --output=size,used -B1 / | tail -n 1";
      echo "SITES:$(eval $COMMAND_SITES):SITES_END";
      echo "CPU:$(eval $COMMAND_CPU):CPU_END";
      echo "RAM_KB:$(eval $COMMAND_RAM):RAM_KB_END";
      echo "STORAGE:$(eval $COMMAND_STORAGE):STORAGE_END";
    `;

    checkpoint = 'calling-ssh-service';
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

    checkpoint = 'checking-ssh-response';
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(JSON.stringify(errorData));
    }

    checkpoint = 'parsing-ssh-output';
    const responseData = await response.json();
    const output = responseData.stdout;

    const siteCount = output.match(/SITES:(.*?):SITES_END/)?.[1].trim() || '0';
    const cpuCores = output.match(/CPU:(.*?):CPU_END/)?.[1].trim() || '0';
    
    // Robust RAM parsing: find the line, then find the first number in it.
    const ramLine = output.match(/RAM_KB:(.*?):RAM_KB_END/)?.[1] || '';
    const totalRamKB = ramLine.match(/\d+/)?.[0] || '0';

    const storage = output.match(/STORAGE:(.*?):STORAGE_END/)?.[1].trim().split(' ') || ['0', '0'];

    checkpoint = 'formatting-final-data';
    const overview = {
        siteCount: parseInt(siteCount, 10),
        cpuCores: parseInt(cpuCores, 10),
        totalRamMB: Math.round(parseInt(totalRamKB, 10) / 1024),
        totalStorageBytes: parseInt(storage[0], 10),
        usedStorageBytes: parseInt(storage[1], 10),
    };

    return new Response(JSON.stringify(overview), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message, checkpoint }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
