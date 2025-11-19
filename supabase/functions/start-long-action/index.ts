import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// Helper to construct the command based on action
const getCommand = (action, params) => {
  const { domain, user, pass, email, username, role, userId } = params;
  // Escape password to handle special characters in the command
  const escapedPass = pass ? pass.replace(/'/g, "'\\''") : '';

  switch (action) {
    case 'install-wordops':
      return `sudo wo stack install --nginx && echo 'y' | sudo wo stack install --php && echo 'y' | sudo wo stack install --mysql && echo 'y' | sudo wo stack install --wpcli && echo 'y' | sudo wo stack install --netdata && echo 'y' | sudo wo stack install --dashboard && echo 'y' | sudo wo stack install --composer && sudo wo stack install --admin`;
    case 'create-wordpress-site':
      return `sudo wo site create ${domain} --wp --user=${user} --pass='${escapedPass}' --email=${email} --le && sudo ufw allow 80/tcp && sudo ufw allow 443/tcp && sudo ufw reload && echo 'y' | sudo ufw enable`;
    case 'install-ssl-site':
      return `echo 'y' | sudo wo site update ${domain} --letsencrypt`;
    case 'delete-wordpress-site':
      return `sudo wo site delete ${domain} --force`;
    case 'create-wp-user':
        return `cd /var/www/${domain}/htdocs && wp user create ${username} ${email} --role=${role} --user_pass='${escapedPass}' --allow-root`;
    case 'delete-wp-user':
        return `cd /var/www/${domain}/htdocs && wp user delete ${userId} --yes --allow-root`;
    case 'update-wp-user': {
        let updateFlags = '';
        if (pass) updateFlags += ` --user_pass='${escapedPass}'`;
        if (email) updateFlags += ` --user_email=${email}`;
        if (role) updateFlags += ` --role=${role}`;
        if (!updateFlags) throw new Error('No update parameters provided for update-wp-user.');
        return `cd /var/www/${domain}/htdocs && wp user update ${userId}${updateFlags} --allow-root`;
    }
    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('CUSTOM_SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { vpsId, action, params } = await req.json();
    if (!vpsId || !action || !params) {
      throw new Error('vpsId, action, and params are required.');
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

    const command = getCommand(action, params);
    const logFileName = `wo-action-${Date.now()}.log`;
    const pidFileName = `${logFileName}.pid`;
    const commandToExecute = `nohup bash -c 'set -x; ${command}' > /tmp/${logFileName} 2>&1 & echo $! > /tmp/${pidFileName}`;

    const sshResponse = await fetch(`${sshServiceUrl}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        host: credentials.host,
        port: credentials.port,
        username: credentials.username,
        password: credentials.encrypted_password,
        command: commandToExecute,
        wait_for_output: false
      }),
    });

    if (!sshResponse.ok) {
        const errorBody = await sshResponse.text();
        throw new Error(`SSH service responded with an error: ${sshResponse.status} - ${errorBody}`);
    }

    // Don't need to await sshResponse.json() as we are not waiting for output

    return new Response(JSON.stringify({
        logFileName: logFileName,
        pidFileName: pidFileName,
        status: 'started'
    }), {
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
