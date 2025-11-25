import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { getAncillaryData } from '../_shared/ai-helpers.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const { job_id } = await req.json();
  if (!job_id) throw new Error('Missing job_id');

  const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('CUSTOM_SUPABASE_SERVICE_ROLE_KEY') ?? '');

  const updateJob = async (updates) => await supabaseAdmin.from('article_jobs').update(updates).eq('id', job_id);

  try {
    console.log(`--- Step 4: Assemble and Post for Job ID: ${job_id} ---`);
    await updateJob({ status: 'posting_to_wordpress' });

    const { job, siteData } = await getAncillaryData(supabaseAdmin, job_id);
    const { generated_title, generated_body } = job;

    if (!generated_title || !generated_body) {
        throw new Error('Missing generated title or body content to post.');
    }

    const { site_url, wp_username, encrypted_application_password } = siteData;
    const wpApiUrl = `${site_url.replace(/\/?$/, '')}/wp-json/wp/v2/posts`;

    console.log(`[+] Posting final article for job ${job_id} to ${wpApiUrl}`);
    const postResponse = await fetch(wpApiUrl, {
        method: 'POST',
        headers: { 'Authorization': `Basic ${btoa(`${wp_username}:${atob(encrypted_application_password)}`)}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: generated_title, content: generated_body, status: 'draft' }),
    });

    if (!postResponse.ok) {
        const errorBody = await postResponse.json();
        throw new Error(`Failed to post article to WordPress: ${errorBody.message || 'Unknown error'}`);
    }
    const postData = await postResponse.json();
    console.log(`[+] Article posted successfully to WordPress. Post ID: ${postData.id}`);

    await updateJob({ status: 'completed', final_post_id: postData.id, error_message: null });
    console.log(`[+] Job ${job_id} completed successfully.`);

    return new Response(JSON.stringify({ message: "Step 4 successful, article posted." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
    });
  } catch (error) {
    console.error(`[-] Error in step-4-assemble-and-post for job ${job_id}:`, error.message);
    await updateJob({ status: 'failed', error_message: `Step 4 (Post): ${error.message}` });
    return new Response(JSON.stringify({ error: error.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
    });
  }
});
