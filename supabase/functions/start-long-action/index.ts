import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// Helper to construct the command based on action
const getCommand = (action, params) => {
  const { domain, user, pass, email, username, role, userId, userLogin } = params;
  // Escape password to handle special characters in the command
  const escapedPass = pass ? pass.replace(/'/g, "'\\''") : '';

  switch (action) {
    case 'install-wordops': {
      console.log('[DEBUG] getCommand: Matched "install-wordops" action with params:', params);
      const woUsername = params.username || 'WordOps';
      const woEmail = params.email || 'hello@example.com';
      const escapedUsername = woUsername.replace(/'/g, "'\\''");
      const escapedEmail = woEmail.replace(/'/g, "'\\''");
      // v18 with detailed logs (and corrected wo setup)
      return `
        EXIT_CODE_FILE=$(mktemp)
        (
            (
                echo '--- EXECUTANDO A VERSÃO v18 (LOGS DETALHADOS) ---';
                
                # Step 1
                echo "--> INÍCIO: Limpeza de repositórios antigos." && \
                (sudo sed -i '/opensuse.org/d' /etc/apt/sources.list 2>/dev/null || true) && \
                (sudo rm -f /etc/apt/sources.list.d/*wordops*.list /etc/apt/sources.list.d/*wo*.list 2>/dev/null || true) && \
                echo "<-- FIM: Limpeza de repositórios." && \

                # Step 2
                echo "--> INÍCIO: Update inicial e instalação de dependências." && \
                sudo apt-get update -y && \
                sudo apt-get install -y apt-transport-https ca-certificates curl gnupg dnsutils && \
                echo "<-- FIM: Dependências instaladas." && \

                # Step 3
                echo "--> INÍCIO: Download da chave GPG do WordOps." && \
                wget -qO /tmp/wordops.key https://repo.wordops.net/wopkgs.key && \
                echo "<-- FIM: Download da chave GPG." && \

                # Step 3b
                echo "--> INÍCIO: Instalação da chave GPG." && \
                sudo gpg --dearmor -o /usr/share/keyrings/wordops.gpg /tmp/wordops.key && \
                echo "<-- FIM: Chave GPG instalada." && \

                # Step 4
                echo "--> INÍCIO: Adição do repositório oficial do WordOps." && \
                echo "deb [signed-by=/usr/share/keyrings/wordops.gpg] https://repo.wordops.net/debian/ bookworm main" | sudo tee /etc/apt/sources.list.d/wordops.list > /dev/null && \
                echo "<-- FIM: Repositório adicionado." && \

                # Step 5
                echo "--> INÍCIO: Segundo update do apt-cache." && \
                sudo apt-get update -y && \
                echo "<-- FIM: Segundo update concluído." && \

                # Step 6
                echo "--> INÍCIO: Instalação do pacote WordOps e configuração inicial." && \
                # Use user-provided username and email for initial setup.
                sudo apt-get install -y wordops && \
                sudo wo setup --admin-user='${escapedUsername}' --admin-email='${escapedEmail}' --force && \
                echo "<-- FIM: Pacote WordOps instalado e configurado." && \

                # Step 7
                echo "--> INÍCIO: Instalação da stack (Nginx, PHP, etc.)." && \
                sudo wo stack install --force && \
                echo "<-- FIM: Instalação da stack concluída."
            );
            echo $? > \${EXIT_CODE_FILE}
        ) 2>&1 | tee /tmp/wo-install-$(date +%s).log

        FINAL_EXIT_CODE=$(cat \${EXIT_CODE_FILE})
        rm \${EXIT_CODE_FILE}
        exit \${FINAL_EXIT_CODE}
      `;
    }
    case 'create-wordpress-site':
      return `sudo wo site create ${domain} --wp --user=${user} --pass='${escapedPass}' --email=${email} --le && sudo ufw allow 80/tcp && sudo ufw allow 443/tcp && sudo ufw reload && echo 'y' | sudo ufw enable`;
    case 'install-ssl-site':
      return `echo 'y' | sudo wo site update ${domain} --letsencrypt`;
    case 'delete-wordpress-site':
      return `sudo wo site delete ${domain} --force`;
    case 'create-wp-user':
        return `wp user create ${username} ${email} --role=${role} --user_pass='${escapedPass}' --path=/var/www/${domain}/htdocs --allow-root`;
    case 'delete-wp-user':
        return `wp user delete ${userId} --yes --path=/var/www/${domain}/htdocs --allow-root`;
    case 'update-wp-user': {
        const userIdentifier = userLogin || userId;
        if (!userIdentifier) throw new Error('No user identifier (userLogin or userId) provided for update-wp-user.');

        let updateFlags = '';
        if (pass) updateFlags += ` --user_pass='${escapedPass}'`;
        if (email) updateFlags += ` --user_email=${email}`;
        if (role) updateFlags += ` --role='${role}'`;
        
        if (!updateFlags) throw new Error('No update parameters provided for update-wp-user.');
        
        const debugEcho = `echo "DEBUG: Updating user identifier: ${userIdentifier}, Role: ${role}, Flags: ${updateFlags.trim()}"`;
        return `${debugEcho} && wp user update ${userIdentifier}${updateFlags} --path=/var/www/${domain}/htdocs --allow-root`;
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
    console.log('--- start-long-action v4 (Synchronous Final Attempt) ---');

    const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('CUSTOM_SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    const sshServiceUrl = Deno.env.get('VERCEL_SSH_SERVICE_URL');
    if (!sshServiceUrl) {
        console.error('start-long-action: VERCEL_SSH_SERVICE_URL is not set.');
        throw new Error('VERCEL_SSH_SERVICE_URL is not set.');
    }

    const { vpsId, action, params } = await req.json();
    console.log('start-long-action: Request body parsed:', { vpsId, action, params });

    if (!vpsId || !action || !params) {
        console.error('start-long-action: Missing vpsId, action, or params.');
        throw new Error('vpsId, action, and params are required.');
    }

    if (params.domain) {
        params.domain = params.domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
    }

    const { data: credentials, error: credError } = await supabaseClient
        .from('vps_credentials')
        .select('host, port, username, encrypted_password')
        .eq('id', vpsId)
        .single();

    if (credError) throw credError;
    if (!credentials) throw new Error('VPS credentials not found in DB.');
    console.log('start-long-action: VPS credentials fetched for host:', credentials.host);

    const command = getCommand(action, params);
    
    // Always synchronous for this final attempt
    const commandToExecute = `
        echo "--- Iniciando Instalação Síncrona em $(date) ---";
        set -x;
        ${command};
        # The exit code is handled inside the getCommand script now
    `;

    console.log('start-long-action: Sending command to SSH service. Host:', credentials.host);
    
    const sshResponse = await fetch(`${sshServiceUrl}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            host: credentials.host,
            port: credentials.port,
            username: credentials.username,
            password: credentials.encrypted_password,
            command: commandToExecute,
            wait_for_output: true
        }),
    });
    console.log('start-long-action: Received response from SSH service. Status:', sshResponse.status);

    if (!sshResponse.ok) {
        const errorBody = await sshResponse.text();
        console.error('start-long-action: SSH service responded with non-ok status:', sshResponse.status, errorBody);
        throw new Error(`SSH service responded with an error (Status: ${sshResponse.status}): ${errorBody}`);
    }

    const responseBody = await sshResponse.json();

    // Return the full output directly
    return new Response(JSON.stringify({
        status: responseBody.exitCode === 0 ? 'completed' : 'failed',
        stdout: responseBody.stdout,
        stderr: responseBody.stderr,
        exitCode: responseBody.exitCode,
        message: responseBody.message 
    }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
    });

  } catch (error) {
    console.error('start-long-action: CATCH BLOCK ERROR:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});