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
      // v26 - non-interactive, no nesting
      return `
        set -ex

        echo "--- INICIANDO INSTALAÇÃO DO WORDOPS (v26 - non-interactive) ---"

        echo "--> ETAPA 0: Limpeza profunda..."
        (
          set +e
          if command -v wo &> /dev/null; then
            echo "Desinstalando stacks e limpando configs..."
            sudo wo clean --all
          fi
          echo "Removendo binário, configs e dados..."
          sudo rm -f /usr/local/bin/wo
          sudo rm -rf /etc/wo
          sudo rm -rf /var/log/wo /var/lib/wo
        )
        echo "<-- ETAPA 0 CONCLUÍDA."

        echo "--> ETAPA 1: Reinstalando a CLI 'wo' do zero..."
        sudo git config --global user.name "${escapedUsername}"
        sudo git config --global user.email "${escapedEmail}"
        wget -qO wo wops.cc && sudo bash wo --force
        echo "<-- ETAPA 1 CONCLUÍDA."

        echo "--> ETAPA 2: Instalando o stack do WordOps..."
        export DEBIAN_FRONTEND=noninteractive
        sudo -E wo stack install --force --all
        echo "<-- ETAPA 2 CONCLUÍDA."

        echo "--- INSTALAÇÃO DO WORDOPS CONCLUÍDA ---"
        exit 0
      `;
    }
                                              case 'create-wordpress-site':
                                                return `sudo /usr/local/bin/wo site create ${domain} --wpfc --user=${user} --pass='${escapedPass}' --email=${email} --letsencrypt && sudo ufw allow 80/tcp && sudo ufw allow 443/tcp && sudo ufw reload && echo 'y' | sudo ufw enable`;          case 'install-ssl-site':
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
        const log = (message, data) => console.log(`[start-long-action] ${message}`, data !== undefined ? data : '');
        
        log('--- Início da execução ---');
      
        if (req.method === 'OPTIONS') {
          log('Recebida requisição OPTIONS, respondendo com OK.');
          return new Response('ok', { headers: corsHeaders });
        }
      
        try {
        log('v5 - com logs detalhados');
    
        log('Inicializando cliente Supabase...');
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('CUSTOM_SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );
        log('Cliente Supabase inicializado.');
    
        log('Verificando URL do serviço SSH...');
        const sshServiceUrl = Deno.env.get('VERCEL_SSH_SERVICE_URL');
        if (!sshServiceUrl) {
            console.error('[start-long-action] ERRO: VERCEL_SSH_SERVICE_URL não está definida.');
            throw new Error('VERCEL_SSH_SERVICE_URL is not set.');
        }
        log('URL do serviço SSH verificada.', sshServiceUrl);
    
        log('Analisando corpo da requisição...');
        const { vpsId, action, params } = await req.json();
        log('Corpo da requisição analisado:', { vpsId, action, params });
    
        if (!vpsId || !action || !params) {
            console.error('[start-long-action] ERRO: Faltando vpsId, action, ou params.');
            throw new Error('vpsId, action, and params are required.');
        }
    
        if (params.domain) {
            log('Normalizando domínio...', { original: params.domain });
            params.domain = params.domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
            log('Domínio normalizado:', { novo: params.domain });
        }
    
        log('Buscando credenciais do VPS no banco de dados...', { vpsId });
        const { data: credentials, error: credError } = await supabaseClient
            .from('vps_credentials')
            .select('host, port, username, encrypted_password')
            .eq('id', vpsId)
            .single();
    
        if (credError) {
            console.error('[start-long-action] ERRO ao buscar credenciais:', credError);
            throw credError;
        }
        if (!credentials) {
            console.error('[start-long-action] ERRO: Credenciais do VPS não encontradas no BD.');
            throw new Error('VPS credentials not found in DB.');
        }
        log('Credenciais do VPS encontradas para o host:', credentials.host);
    
        const command = getCommand(action, params);
        log('Comando construído.');

        // ASYNC handling for 'install-wordops' using log/pid files
        if (action === 'install-wordops') {
            const runId = Date.now();
            const logFileName = `wo-install-${runId}.log`;
            const pidFileName = `wo-install-${runId}.pid`;

            const escapedCommand = command.replace(/'/g, "'\\''");
            
            // Use `nohup` for a more robust background execution.
            // It ensures the process is detached from the shell and continues running even if the shell is closed.
            const commandToExecute = `
                LOG_FILE="/tmp/${logFileName}";
                PID_FILE="/tmp/${pidFileName}";
                touch $LOG_FILE $PID_FILE;
                nohup bash -c '${escapedCommand}' > $LOG_FILE 2>&1 &
                echo $! > $PID_FILE;
            `;

            log('Comando "install-wordops" será executado em background com nohup.', { logFileName, pidFileName });

            const sshResponse = await fetch(`${sshServiceUrl}/execute`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    host: credentials.host,
                    port: credentials.port,
                    username: credentials.username,
                    password: credentials.encrypted_password,
                    command: commandToExecute,
                    wait_for_output: true // Wait for the `echo $!` command to finish
                }),
            });

            if (!sshResponse.ok) {
                const errorBodyText = await sshResponse.text();
                throw new Error(`SSH service responded with an error (Status: ${sshResponse.status}): ${errorBodyText}`);
            }

            log('Ação assíncrona iniciada. Respondendo ao cliente com nomes de arquivo.');
            return new Response(JSON.stringify({ logFileName, pidFileName }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            });
        }

        // --- Default synchronous execution for other actions ---
        const commandToExecute = `
            echo "--- Iniciando Execução Síncrona em $(date) ---";
            set -x;
            ${command};
        `;
        log('Comando final a ser executado via SSH:', commandToExecute);
    
        log('Enviando comando para o serviço SSH...', { host: credentials.host });
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
        log('Resposta recebida do serviço SSH.', { status: sshResponse.status });
    
        if (!sshResponse.ok) {
            const errorBodyText = await sshResponse.text();
            console.error(`[start-long-action] ERRO: Serviço SSH respondeu com status ${sshResponse.status}.`, errorBodyText);
            
            log('Tentando analisar corpo do erro como JSON...');
            try {
                const errorBody = JSON.parse(errorBodyText);
                log('Corpo do erro analisado como JSON.', errorBody);
                
                // Special handling for SSL failure during site creation
                if (action === 'create-wordpress-site' &&
                    errorBody.stdout && 
                    errorBody.stdout.includes('Successfully created site') && 
                    errorBody.stdout.includes('Aborting SSL certificate issuance')) 
                {
                     log('CASO ESPECIAL: Site criado, mas SSL falhou. Respondendo 200 para o cliente tratar.');
                     return new Response(JSON.stringify(errorBody), {
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                        status: 200, 
                    });
                }
    
                // Special handling for SSL failure during installation
                if (action === 'install-ssl-site' &&
                    errorBody.stdout &&
                    errorBody.stdout.includes('Aborting SSL certificate issuance'))
                {
                    log('CASO ESPECIAL: Instalação de SSL falhou (provavelmente DNS). Respondendo 200 para o cliente tratar.');
                    return new Response(JSON.stringify(errorBody), {
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                        status: 200,
                    });
                }
            } catch(e) {
                log('Falha ao analisar corpo do erro como JSON.', e.message);
                throw new Error(`SSH service responded with a non-JSON error (Status: ${sshResponse.status}): ${errorBodyText}`);
            }
            
            log('Erro não corresponde a nenhum caso especial. Lançando erro.');
            throw new Error(`SSH service responded with an error (Status: ${sshResponse.status}): ${errorBodyText}`);
        }
    
        log('Serviço SSH respondeu com sucesso. Analisando corpo da resposta...');
        const responseBody = await sshResponse.json();
        log('CORPO DA RESPOSTA DO SSH:', responseBody);
        log('Corpo da resposta analisado. Enviando para o cliente.');
    
        return new Response(JSON.stringify(responseBody), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });
    
      } catch (error) {
          console.error('[start-long-action] ERRO NO BLOCO CATCH:', error.message, error.stack);
          return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Tpe': 'application/json' },
            status: 500,
          });
        }
      });