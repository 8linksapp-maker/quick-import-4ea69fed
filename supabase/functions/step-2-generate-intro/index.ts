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
    console.log(`--- Step 2: Generate Introduction for Job ID: ${job_id} ---`);
    await updateJob({ status: 'processing_introduction' });

    const { job, prompts, openaiApiKey } = await getAncillaryData(supabaseAdmin, job_id);
    const { outlines, generated_title } = job;
    
    const outlineHeadings = outlines.split('\n').filter(line => line.trim().match(/^H\d/i));
    if (outlineHeadings.length === 0) throw new Error("No valid outlines found in job.");

    const introduction = await callOpenAI(openaiApiKey, prompts.generate_introduction, `Article Title: "${generated_title}"

First Outline Heading: "${outlineHeadings[0]}"

Write the introduction for this article.`);

    await updateJob({
      generated_introduction: introduction,
      last_written_content: introduction
    });
    console.log(`[+] Introduction generated for job ${job_id}.`);

    // Invoke the next step (the first content generation)
    const { error: invokeError } = await supabaseAdmin.functions.invoke('step-3-generate-content', {
        body: { job_id, outline_index: 0 },
        invokeType: 'detached'
    });
    if (invokeError) throw new Error(`Failed to invoke step-3-generate-content: ${invokeError.message}`);

    return new Response(JSON.stringify({ message: "Step 2 successful, invoked step 3." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
    });
  } catch (error) {
    console.error(`[-] Error in step-2-generate-intro for job ${job_id}:`, error.message);
    await updateJob({ status: 'failed', error_message: `Step 2 (Intro): ${error.message}` });
    return new Response(JSON.stringify({ error: error.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
    });
  }
});
