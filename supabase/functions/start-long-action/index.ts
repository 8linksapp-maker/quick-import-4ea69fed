import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// Helper to construct the command based on action
const getCommand = (action, params) => {
  const { domain, user, pass, email, username, role, userId, userLogin } = params;
  // Escape password to handle special characters in the command
  const escapedPass = pass ? pass.replace(/'/g, "'\\''") : '';

  switch (action) {
    case 'install-wordops':
      // Primeiro, baixar e instalar o WordOps CLI, depois a stack
      return `wget -qO wo wops.cc && sudo bash wo --force && sudo wo stack install --nginx && echo 'y' | sudo wo stack install --php && echo 'y' | sudo wo stack install --mysql && echo 'y' | sudo wo stack install --wpcli && echo 'y' | sudo wo stack install --netdata && echo 'y' | sudo wo stack install --dashboard && echo 'y' | sudo wo stack install --composer && sudo wo stack install --admin`;
    case 'create-wordpress-site':
      return `sudo wo site create ${domain} --wp --user=${user} --pass='${escapedPass}' --email=${email} --le && sudo ufw allow 80/tcp && sudo ufw allow 443/tcp && sudo ufw reload && echo 'y' | sudo ufw enable`;
    case 'install-ssl-site':
      return `echo 'y' | sudo wo site update ${domain} --letsencrypt`;
    case 'delete-wordpress-site':
      return `sudo wo site delete ${domain} --force`;
    case 'create-wp-user':
        return `wp user create ${username} ${email} --role=${role} --user_pass='${escapedPass}' --allow-root`;
    case 'delete-wp-user':
        return `wp user delete ${userId} --yes --allow-root`;
    case 'update-wp-user': {
        // Usar userLogin se disponível, caso contrário fallback para userId
        const userIdentifier = userLogin || userId;
        if (!userIdentifier) throw new Error('No user identifier (userLogin or userId) provided for update-wp-user.');

        let updateFlags = '';
        if (pass) updateFlags += ` --user_pass='${escapedPass}'`;
        if (email) updateFlags += ` --user_email=${email}`;
        if (role) updateFlags += ` --role='${role}'`; // Adicionado aspas extras para role
        
        if (!updateFlags) throw new Error('No update parameters provided for update-wp-user.');
        
        // Adiciona depuração extra nos logs da VPS para verificar os valores
        const debugEcho = `echo "DEBUG: Updating user identifier: ${userIdentifier}, Role: ${role}, Flags: ${updateFlags.trim()}"`;

        return `${debugEcho} && wp user update ${userIdentifier}${updateFlags} --allow-root`;
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
    console.log('start-long-action: Function started.');

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    if (!SUPABASE_URL) {
        console.error('start-long-action: SUPABASE_URL is not set.');
        throw new Error('SUPABASE_URL is not set.');
    }
    console.log('start-long-action: SUPABASE_URL is set.');

    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('CUSTOM_SUPABASE_SERVICE_ROLE_KEY');
    if (!SUPABASE_SERVICE_ROLE_KEY) {
        console.error('start-long-action: CUSTOM_SUPABASE_SERVICE_ROLE_KEY is not set.');
        throw new Error('CUSTOM_SUPABASE_SERVICE_ROLE_KEY is not set.');
    }
    console.log('start-long-action: CUSTOM_SUPABASE_SERVICE_ROLE_KEY is set.');
    
    const sshServiceUrl = Deno.env.get('VERCEL_SSH_SERVICE_URL');
    if (!sshServiceUrl) {
        console.error('start-long-action: VERCEL_SSH_SERVICE_URL is not set.');
        throw new Error('VERCEL_SSH_SERVICE_URL is not set.');
    }
    console.log('start-long-action: VERCEL_SSH_SERVICE_URL is set.');

    let supabaseClient;
    try {
        supabaseClient = createClient(
            SUPABASE_URL,
            SUPABASE_SERVICE_ROLE_KEY
        );
        console.log('start-long-action: Supabase client created.');
    } catch (e) {
        console.error('start-long-action: Failed to create Supabase client:', e.message);
        throw new Error(`Failed to create Supabase client: ${e.message}`);
    }

    const { vpsId, action, params } = await req.json();
    console.log('start-long-action: Request body parsed:', { vpsId, action, params });

    if (!vpsId || !action || !params) {
        console.error('start-long-action: Missing vpsId, action, or params.');
        throw new Error('vpsId, action, and params are required.');
    }

    // Normalizar o domínio AQUI, antes de ser usado no script bash e no getCommand
    let normalizedDomain = params.domain;
    if (normalizedDomain) {
        normalizedDomain = normalizedDomain.replace(/^https?:\/\//, '');
        normalizedDomain = normalizedDomain.replace(/\/$/, '');
    }
    params.domain = normalizedDomain; // Atualiza o params com o domínio normalizado
    
    // ... (resto da função)


    let credentials;
    try {
        const { data, error } = await supabaseClient
            .from('vps_credentials')
            .select('host, port, username, encrypted_password')
            .eq('id', vpsId)
            .single();

        if (error) {
            console.error('start-long-action: Error fetching VPS credentials:', error.message);
            throw error;
        }
        if (!data) { // Verifica se data é nulo explicitamente
            console.error('start-long-action: VPS credentials not found in DB.');
            throw new Error('VPS credentials not found in DB.');
        }
        credentials = data;
        console.log('start-long-action: VPS credentials fetched for host:', credentials.host);
    } catch (e) {
        console.error('start-long-action: Failed to fetch VPS credentials:', e.message);
        throw new Error(`Failed to fetch VPS credentials: ${e.message}`);
    }


    const command = getCommand(action, params);
    const logFileName = `wo-action-${Date.now()}.log`;
    const pidFileName = `${logFileName}.pid`;
    
    let commandToExecute;
    let waitForOutput = false;
    const userActions = ['create-wp-user', 'delete-wp-user', 'update-wp-user'];

    if (userActions.includes(action)) {
      waitForOutput = true; // Para ações de usuário, aguardar a saída para depuração
      const { domain } = params;
      if (!domain) throw new Error('Domain is required for WP user actions.');
      
      const script = `
        echo "--- Iniciando ação (${action}) para o domínio ${domain} ---"
        set -x
        
        TARGET_DIR="/var/www/${domain}/htdocs"

        if [ ! -d "$TARGET_DIR" ]; then
          echo "ERRO: O diretório do site $TARGET_DIR não foi encontrado."
          exit 1
        fi

        cd "$TARGET_DIR" || exit 1
        
        echo "--- Executando comando WP-CLI ---"
        echo "TARGET_DIR: $TARGET_DIR"
        pwd
        echo "WP-CLI Command:" # Imprime apenas o rótulo
        ${command} # Executa o comando completo (debugEcho e WP-CLI)
        
        WP_EXIT_CODE=$?
        echo "--- Comando WP-CLI finalizado com código de saída: $WP_EXIT_CODE ---"
        
        exit $WP_EXIT_CODE
      `;
      // Escape the entire script for safe execution
      commandToExecute = script;

    } else {
      commandToExecute = `nohup bash -c 'set -x; ${command}' > /tmp/${logFileName} 2>&1 & echo $! > /tmp/${pidFileName}`;
    }

    console.log('start-long-action: Sending command to SSH service. Host:', credentials.host);
    console.log('start-long-action: SSH Service URL:', sshServiceUrl); // Log da URL do serviço SSH
    let sshResponse;
    try {
        sshResponse = await fetch(`${sshServiceUrl}/execute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                host: credentials.host,
                port: credentials.port,
                username: credentials.username,
                password: credentials.encrypted_password,
                command: commandToExecute,
                wait_for_output: waitForOutput
            }),
        });
        console.log('start-long-action: Received response from SSH service. Status:', sshResponse.status);
    } catch (e) {
        console.error('start-long-action: Failed to connect to SSH service or network error:', e.message); // Log de erro de conexão
        throw new Error(`Failed to connect to SSH service: ${e.message}`);
    }

    if (!sshResponse.ok) {
        const errorBody = await sshResponse.text();
        console.error('start-long-action: SSH service responded with non-ok status:', sshResponse.status, errorBody); // Log do status e corpo do erro
        throw new Error(`SSH service responded with an error (Status: ${sshResponse.status}): ${errorBody}`);
    }

    let responseBody;
    try {
        responseBody = await sshResponse.json(); // Tenta ler como JSON
    } catch (jsonError) {
        // Se não for JSON, lê como texto e lança um erro
        const errorText = await sshResponse.text();
        throw new Error(`SSH service returned non-JSON response (Status: ${sshResponse.status}): ${errorText}`);
    }

    if (waitForOutput) {
        // Para ações de usuário, retornamos a saída diretamente
        // O erro agora será capturado pelo try/catch externo da função serve
        return new Response(JSON.stringify({
            status: 'completed',
            stdout: responseBody.stdout,
            stderr: responseBody.stderr,
            exitCode: responseBody.exitCode, // Captura o exitCode se disponível
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
    } else { // Este é o bloco para install-wordops e outras ações em segundo plano
        // Se o serviço SSH retornou 202 Accepted, o comando foi iniciado com sucesso em segundo plano
        // Não esperamos um JSON detalhado aqui. Apenas confirmamos o início.
        if (sshResponse.status === 202) {
            return new Response(JSON.stringify({
                logFileName: logFileName,
                pidFileName: pidFileName,
                status: 'running' // <<--- ALTERADO AQUI DE 'started' PARA 'running'
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200,
            });
        } else {
            // Se não for 202, e não for waitForOutput, ainda assim é um erro inesperado do serviço SSH
            const errorText = await sshResponse.text();
            throw new Error(`SSH service responded unexpectedly (Status: ${sshResponse.status}): ${errorText}`);
        }
    }

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});