import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';


// Function to get user ID from JWT
import { decode } from 'https://deno.land/x/djwt@v2.2/mod.ts';

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
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { siteId, title, outlines, apiName = 'openai' } = await req.json();
    if (!siteId || !title || !outlines) {
      throw new Error('Missing required fields: siteId, title, and outlines are required.');
    }

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.split(' ')[1];
    const userId = getUserIdFromToken(token);
    if (!userId) {
      throw new Error('User not authenticated.');
    }

    // Use the service role key to have admin-level access
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('CUSTOM_SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Re-integrate Promise.all to fetch site, prompt, and API data concurrently.
    const [
      { data: siteData, error: siteError },
      { data: promptData, error: promptError },
      { data: openaiConfigs, error: openaiConfigError }
    ] = await Promise.all([
      supabaseAdmin.from('wp_sites').select('site_url, wp_username, encrypted_application_password').eq('id', siteId).eq('user_id', userId).single(),
      supabaseAdmin.from('prompts').select('prompt_text').eq('prompt_type', 'informational').eq('is_default', true).single(),
      supabaseAdmin.from('api_configs').select('credentials, name').eq('name', 'ChatGPT') // Simplified query without status
    ]);

    if (siteError) throw new Error(`Failed to fetch site data: ${siteError.message}`);
    if (!siteData) throw new Error('WordPress site not found or access denied.');
    if (promptError) throw new Error(`Failed to fetch prompt: ${promptError.message}`);
    if (!promptData) throw new Error('Default informational prompt not found.');

    // --- API Config Diagnostics ---
    console.log(`[DIAGNOSTIC-3] Found ${openaiConfigs?.length || 0} configs with name 'ChatGPT' (status ignored).`);
    console.log(`[DIAGNOSTIC-3] Full data: ${JSON.stringify(openaiConfigs, null, 2)}`);

    if (openaiConfigError) throw new Error(`Failed to fetch ChatGPT API config: ${openaiConfigError.message}`);
    if (!openaiConfigs || openaiConfigs.length === 0) throw new Error('DIAGNOSTIC: No config with name \'ChatGPT\' found at all.');
    
    const openaiConfig = openaiConfigs[0]; // Use the first result
    if (!openaiConfig.credentials?.apiKey) throw new Error('DIAGNOSTIC: API key not found in credentials object.');
    // --- End Diagnostics ---

    const { site_url, wp_username, encrypted_application_password } = siteData;
    const { prompt_text } = promptData;
    const openaiApiKey = openaiConfig.credentials.apiKey;

    // --- WordPress Auth Diagnostics ---
    console.log(`[WP-AUTH] Attempting to post to ${site_url} with user: ${wp_username}`);
    console.log(`[WP-AUTH] App Password starts with: ${encrypted_application_password.substring(0, 4)}...`);
    // --- End Diagnostics ---

    // SINGLE-CALL GENERATION LOGIC (Reverted)
    const fullPrompt = `${prompt_text}\n\nUse as diretrizes para escrever um artigo completo em HTML para o título "${title}" com as seguintes seções (outlines):\n${outlines}`;

    const chatResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo',
        messages: [
          { role: 'system', content: prompt_text },
          { role: 'user', content: fullPrompt },
        ],
      })
    });

    if (!chatResponse.ok) {
      const errorBody = await chatResponse.json();
      throw new Error(`OpenAI API Error: ${errorBody.error.message}`);
    }

    const chatData = await chatResponse.json();
    const articleContent = chatData.choices[0].message.content;

    // POST TO WORDPRESS
    const wpApiUrl = `${site_url.replace(/\/?$/, '')}/wp-json/wp/v2/posts`;
    const decoded_password = atob(encrypted_application_password);
    const wpAuth = `Basic ${btoa(`${wp_username}:${decoded_password}`)}`;

    const postResponse = await fetch(wpApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${wpAuth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title,
        content: articleContent,
        status: 'draft',
      }),
    });

    if (!postResponse.ok) {
        const errorBody = await postResponse.json();
        throw new Error(`Failed to post article to WordPress: ${errorBody.message || 'Unknown error'}`);
    }

    const postData = await postResponse.json();

    // Construct the edit link
    const edit_link = `${site_url.replace(/\/?$/, '')}/wp-admin/post.php?post=${postData.id}&action=edit`;

    return new Response(JSON.stringify({ 
      message: 'Article created successfully as a draft!', 
      post: postData, 
      edit_link: edit_link 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in create-informational-article function:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
