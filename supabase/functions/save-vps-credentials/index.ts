import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { decode } from 'https://deno.land/x/djwt@v2.2/mod.ts';

// Refactored to use the admin client pattern, same as the user's working functions.
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Create an admin client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('CUSTOM_SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 2. Manually get the user ID from the Authorization header
    const authHeader = req.headers.get('Authorization')!;
    const [_, token] = authHeader.split(' ');
    const decodedToken = decode(token);
    const userId = decodedToken[1].sub;
    if (!userId) {
      throw new Error('User ID not found in token.');
    }

    // 3. Get data from request body
    const { host, port, username, password } = await req.json();
    if (!host || !port || !username || !password) {
      throw new Error('Missing required fields');
    }

    // 4. Test SSH connection via proxy
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

    // 5. Save credentials to the database
    const { error: insertError } = await supabaseClient
      .from('vps_credentials')
      .insert({
        host, port, username,
        encrypted_password: password, // Placeholder for encryption
        user_id: userId, // Explicitly set the user_id
      });

    if (insertError) {
      throw insertError;
    }

    return new Response(JSON.stringify({ message: 'Credentials saved successfully!' }), {
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
