import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { callOpenAI, getAncillaryData } from '../_shared/ai-helpers.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const { job_id } = await req.json();
  if (!job_id) throw new Error('Missing job_id');

  const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('CUSTOM_SUPABASE_SERVICE_ROLE_KEY') ?? '');

  const updateJob = async (updates) => await supabaseAdmin.from('article_jobs').update(updates).eq('id', job_id);

  try {
    console.log(`--- Step 1: Generate Title for Job ID: ${job_id} ---`);
    await updateJob({ status: 'processing_title', error_message: null });

    const { job, prompts, openaiApiKey } = await getAncillaryData(supabaseAdmin, job_id);
    const { outlines } = job;
    
    let title = await callOpenAI(openaiApiKey, prompts.generate_title, `Create a title for an article with these outlines:\n\n${outlines}`);
    title = title.replace(/^"|"$/g, '').trim();

    await updateJob({ generated_title: title });
    console.log(`[+] Title generated: "${title}"`);

    // Invoke the next step
    const { error: invokeError } = await supabaseAdmin.functions.invoke('step-2-generate-intro', {
        body: { job_id },
        invokeType: 'detached'
    });
    if (invokeError) throw new Error(`Failed to invoke step-2-generate-intro: ${invokeError.message}`);

    return new Response(JSON.stringify({ message: "Step 1 successful, invoked step 2." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
    });
  } catch (error) {
    console.error(`[-] Error in step-1-generate-title for job ${job_id}:`, error.message);
    await updateJob({ status: 'failed', error_message: `Step 1 (Title): ${error.message}` });
    return new Response(JSON.stringify({ error: error.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
    });
  }
});
