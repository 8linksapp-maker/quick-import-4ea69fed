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

    const { vpsId, domain: rawDomain } = await req.json();
    if (!vpsId || !rawDomain) {
      throw new Error('vpsId and domain are required.');
    }

    // Limpa o domínio removendo o protocolo e a barra final, se existirem.
    const domain = rawDomain.replace(/^(https?:\/\/)/, '').replace(/\/$/, '');

    const { data: credentials, error: credError } = await supabaseClient
      .from('vps_credentials')
      .select('host, port, username, encrypted_password')
      .eq('id', vpsId)
      .single();

    if (credError) throw credError;
    if (!credentials) throw new Error('VPS credentials not found.');

    const sshServiceUrl = Deno.env.get('VERCEL_SSH_SERVICE_URL');
    if (!sshServiceUrl) throw new Error('VERCEL_SSH_SERVICE_URL is not set.');

    const command = `cd /var/www/${domain}/htdocs && wp user list --allow-root --format=json`;

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
      const errorDetails = responseData.stderr || responseData.error || JSON.stringify(responseData);
      throw new Error(`Falha ao executar comando no servidor: ${errorDetails}`);
    }

    try {
      const users = JSON.parse(responseData.stdout);
      return new Response(JSON.stringify({ users }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    } catch (parseError) {
      throw new Error(`Erro ao processar a resposta do servidor. Saída recebida: ${responseData.stdout || 'vazio'}`);
    }

  } catch (error) {
    return new Response(JSON.stringify({ error: { message: error.message } }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400, // Use 400 for client-side or server-side execution errors
    });
  }
});
