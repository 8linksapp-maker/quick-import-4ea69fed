import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Calls the OpenAI Chat Completions API.
 */
export const callOpenAI = async (apiKey: string, systemPrompt: string, userPrompt: string) => {
  console.log(`[AI] Calling OpenAI with system prompt: "${systemPrompt.substring(0, 50)}..."`);
  const chatResponse = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
    }),
  });

  if (!chatResponse.ok) {
    const errorBody = await chatResponse.json();
    console.error("[-] OpenAI API Error:", errorBody);
    throw new Error(`OpenAI API Error: ${errorBody.error.message}`);
  }

  const chatData = await chatResponse.json();
  console.log('[AI] OpenAI call successful.');
  return chatData.choices[0].message.content;
};

/**
 * Formats a heading string like "H2 - My Title" into "<h2>My Title</h2>".
 */
export const formatHeading = (outlineLine: string): string => {
    const match = outlineLine.match(/^H(\d)\s*-\s*(.*)/i);
    if (match) {
        const level = match[1];
        const text = match[2].trim();
        return `<h${level}>${text}</h${level}>`;
    }
    return `<h2>${outlineLine.trim()}</h2>`;
};

/**
 * Fetches all the common data needed by worker functions for a given job.
 */
export const getAncillaryData = async (supabaseAdmin: ReturnType<typeof createClient>, jobId: number) => {
  console.log(`[+] Fetching all ancillary data for job ${jobId}...`);
  
  const { data: job, error: jobError } = await supabaseAdmin.from('article_jobs').select('*').eq('id', jobId).single();
  if (jobError || !job) throw new Error(`Job not found: ${jobError?.message}`);

  const { site_id, user_id } = job;

  const [
      { data: siteData, error: siteError },
      { data: promptsData, error: promptsError },
      { data: openaiConfig, error: openaiConfigError }
  ] = await Promise.all([
      supabaseAdmin.from('wp_sites').select('site_url, wp_username, encrypted_application_password').eq('id', site_id).eq('user_id', user_id).single(),
      supabaseAdmin.from('prompts').select('prompt_text, prompt_type').in('prompt_type', ['generate_title', 'generate_introduction', 'generate_outline_content']),
      supabaseAdmin.from('api_configs').select('credentials').eq('name', 'ChatGPT').single(),
  ]);

  if (siteError || !siteData) throw new Error(`Site data not found or access denied. ${siteError?.message}`);
  if (promptsError) throw new Error(`Failed to fetch prompts: ${promptsError.message}`);
  if (openaiConfigError) throw new Error(`Failed to fetch API config: ${openaiConfigError.message}`);

  const prompts = promptsData.reduce((acc, p) => ({ ...acc, [p.prompt_type]: p.prompt_text }), {});
  if (!prompts.generate_title || !prompts.generate_introduction || !prompts.generate_outline_content) {
      throw new Error('Required prompts not found (generate_title, generate_introduction, generate_outline_content).');
  }

  const openaiApiKey = openaiConfig?.credentials?.apiKey;
  if (!openaiApiKey) throw new Error('ChatGPT API key not found.');
  
  console.log('[+] Ancillary data fetched successfully.');
  return { job, siteData, prompts, openaiApiKey };
};
