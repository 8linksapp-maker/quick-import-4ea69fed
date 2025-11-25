import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { decode } from 'https://deno.land/x/djwt@v2.2/mod.ts';

// Helper to get user ID from JWT
const getUserIdFromToken = (token: string) => {
  try {
    const [_, payload] = decode(token);
    return payload?.sub || null;
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
};

serve(async (req) => {
  console.log('--- "create-informational-article" trigger started ---');
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Get required data from the request
    const { siteId, outlines } = await req.json();
    console.log(`[+] Received request for siteId: ${siteId}`);
    if (!siteId || !outlines) {
      throw new Error('Missing required fields: siteId and outlines are required.');
    }

    // 2. Authenticate the user
    console.log('[+] Authenticating user...');
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.split(' ')[1];
    const userId = getUserIdFromToken(token);
    if (!userId) {
      return new Response(JSON.stringify({ error: 'User not authenticated.' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    console.log(`[+] User authenticated: ${userId}`);

    // 3. Create a Supabase client with service role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('CUSTOM_SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 4. Insert a new job into the article_jobs table
    console.log(`[+] Inserting new job into 'article_jobs' table.`);
    const { data: jobData, error: insertError } = await supabaseAdmin
      .from('article_jobs')
      .insert({
        site_id: siteId,
        user_id: userId,
        outlines: outlines,
        status: 'pending'
      })
      .select()
      .single();

    if (insertError) {
      console.error('[-] DB Insert Error:', insertError);
      throw new Error(`Failed to create article job: ${insertError.message}`);
    }
    console.log(`[+] Job created successfully with ID: ${jobData.id}`);

    // 5. Invoke the first step of the background worker chain
    console.log(`[+] Invoking background worker 'step-1-generate-title' for job ID: ${jobData.id}`);
    supabaseAdmin.functions.invoke('step-1-generate-title', {
        body: { job_id: jobData.id },
        invokeType: 'detached'
    }).then(({ error: invokeError }) => {
        if (invokeError) {
            console.error(`[-] CRITICAL: Background invocation failed for job ${jobData.id}`, invokeError);
            // If the invocation itself fails, update the job to reflect this failure.
            supabaseAdmin.from('article_jobs')
              .update({ status: 'failed', error_message: `Worker (step 1) failed to start: ${invokeError.message}` })
              .eq('id', jobData.id)
              .then();
        } else {
            console.log(`[+] Background worker for job ${jobData.id} invoked successfully.`);
        }
    });

    // 6. Return an accepted response to the client immediately
    console.log('[+] Returning 202 Accepted to client.');
    return new Response(JSON.stringify({ message: 'Article generation job started successfully.', job_id: jobData.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 202, // 202 Accepted
    });

  } catch (error) {
    console.error('[-] Uncaught Error in create-informational-article trigger:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
