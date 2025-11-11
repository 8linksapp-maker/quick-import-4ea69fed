import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { id, host, port, username, password } = await req.json();
    if (!id || !host || !port || !username) {
      throw new Error('Missing required fields');
    }

    const authHeader = req.headers.get('Authorization')!;
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated.');
    }

    // If password is provided, test SSH connection
    if (password) {
      const sshServiceUrl = Deno.env.get('VERCEL_SSH_SERVICE_URL');
      if (!sshServiceUrl) {
        throw new Error('VERCEL_SSH_SERVICE_URL is not set.');
      }

      const response = await fetch(`${sshServiceUrl}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host, port, username, password,
          command: 'echo "Connection successful"'
        }),
      });

      const responseData = await response.json();
      if (!response.ok || responseData.error) {
        throw new Error(responseData.error || 'Failed to connect to VPS via proxy service.');
      }
    }

    const updateData = {
      host,
      port,
      username,
      ...(password && { encrypted_password: password }), // Placeholder for encryption
    };

    const { error: updateError } = await supabaseClient
      .from('vps_credentials')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id);

    if (updateError) {
      throw updateError;
    }

    return new Response(JSON.stringify({ message: 'Credentials updated successfully!' }), {
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
