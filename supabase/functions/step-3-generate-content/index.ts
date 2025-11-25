import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { callOpenAI, getAncillaryData, formatHeading } from '../_shared/ai-helpers.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const { job_id, outline_index } = await req.json();
  if (job_id === undefined || outline_index === undefined) throw new Error('Missing job_id or outline_index');

  const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('CUSTOM_SUPABASE_SERVICE_ROLE_KEY') ?? '');

  const updateJob = async (updates) => await supabaseAdmin.from('article_jobs').update(updates).eq('id', job_id);

  try {
    console.log(`--- Step 3: Generate Content for Job ID: ${job_id}, Outline Index: ${outline_index} ---`);
    
    const { job, prompts, openaiApiKey } = await getAncillaryData(supabaseAdmin, job_id);
    const { outlines, generated_title, generated_introduction, generated_body, last_written_content } = job;
    
    console.log("--- DEBUG: Raw Outlines from DB ---");
    console.log(outlines);

    const outlineHeadings = outlines.split('\n').filter(line => line.trim().match(/^H\d/i));
    
    console.log("--- DEBUG: Parsed Outline Headings Array ---");
    console.log(outlineHeadings);

    if (outlineHeadings.length === 0) throw new Error("No valid outlines found in job.");

    const currentOutlineHeading = outlineHeadings[outline_index];
    let userPromptForContent = '';

    await updateJob({ status: `processing_outline_${outline_index + 1}_of_${outlineHeadings.length}` });

    if (outline_index === 0) {
      // First outline's context is the title and the full introduction
      userPromptForContent = `Article Title: "${generated_title}"\n\nIntroduction: "${generated_introduction}"\n\nWrite the body content for the first section, which is: "${currentOutlineHeading}"`;
    } else {
      // Subsequent outlines' context is the previous outline's heading and content
      const prevOutlineHeading = outlineHeadings[outline_index - 1];
      userPromptForContent = `The previous section was "(${prevOutlineHeading})"\n\nIts content was:\n"${last_written_content}"\n\nBased on that, write the body content for the next section: "${currentOutlineHeading}"`;
    }

    const newContent = await callOpenAI(openaiApiKey, prompts.generate_outline_content, userPromptForContent);
    
    const newContentBlock = `${formatHeading(currentOutlineHeading)}\n\n${newContent}`;
    // Append the new block to the main body, and update the last_written_content with the newest piece.
    const updatedBody = (generated_body || generated_introduction) + '\n\n' + newContentBlock;

    await updateJob({ 
        generated_body: updatedBody,
        last_written_content: newContent 
    });
    console.log(`[+] Content for outline ${outline_index + 1} generated.`);

    // Check if there are more outlines
    if (outline_index + 1 < outlineHeadings.length) {
      // Invoke the next content generation step
      const { error: invokeError } = await supabaseAdmin.functions.invoke('step-3-generate-content', {
          body: { job_id, outline_index: outline_index + 1 },
          invokeType: 'detached'
      });
      if (invokeError) throw new Error(`Failed to invoke step-3 for next outline: ${invokeError.message}`);
    } else {
      // This was the last outline, invoke the final step
      const { error: invokeError } = await supabaseAdmin.functions.invoke('step-4-assemble-and-post', {
          body: { job_id },
          invokeType: 'detached'
      });
      if (invokeError) throw new Error(`Failed to invoke step-4-assemble-and-post: ${invokeError.message}`);
    }

    return new Response(JSON.stringify({ message: `Step 3 for index ${outline_index} successful.` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
    });
  } catch (error) {
    console.error(`[-] Error in step-3-generate-content for job ${job_id}:`, error.message);
    await updateJob({ status: 'failed', error_message: `Step 3 (Content ${outline_index}): ${error.message}` });
    return new Response(JSON.stringify({ error: error.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
    });
  }
});
