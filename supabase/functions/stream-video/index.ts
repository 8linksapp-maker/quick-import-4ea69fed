import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// This function handles CORS headers for all responses.
const handleCors = (response: Response): Response => {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, Range");
  response.headers.set("Access-Control-Expose-Headers", "Content-Range, Accept-Ranges, Content-Length, Content-Type");
  return response;
};

// Use the built-in Deno.serve for improved stability
Deno.serve(async (req) => {
  // Handle preflight requests for CORS
  if (req.method === "OPTIONS") {
    return handleCors(new Response(null, { status: 204 }));
  }

  const url = new URL(req.url);
  const encodedFile = url.searchParams.get("file");
  const token = url.searchParams.get("token");

  // 1. Validate basic parameters
  if (!encodedFile || !token) {
    const errorBody = JSON.stringify({ error: "file and token parameters are required" });
    return handleCors(new Response(errorBody, { status: 400 }));
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("CRITICAL: Supabase environment variables SUPABASE_URL or SUPABASE_ANON_KEY are not set.");
    const errorBody = JSON.stringify({ error: "Server configuration error" });
    return handleCors(new Response(errorBody, { status: 500 }));
  }

  try {
    // 2. Authenticate the user by creating a Supabase client with the provided token.
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    });

    // Verify the token by fetching the user.
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      console.error("-------------------------------------------------------");
      console.error("--- AUTHENTICATION FAILED ---");
      console.error("Attempted to connect to Supabase project URL:", supabaseUrl);
      console.error("Full authentication error object:", JSON.stringify(userError, null, 2));
      console.error("-------------------------------------------------------");
      
      const errorBody = JSON.stringify({ error: "Invalid or expired token" });
      return handleCors(new Response(errorBody, { status: 401 }));
    }

    // 3. If authentication is successful, proceed to stream the video.
    const videoFile = atob(encodedFile);
    const videoBaseUrl = Deno.env.get('B2_VIDEO_BASE_URL') || 'https://f005.backblazeb2.com/file/seoflix/';
    const videoUrl = `${videoBaseUrl}${videoFile}`;
    
    const range = req.headers.get("Range");
    const headers = new Headers();
    if (range) {
      headers.set("Range", range);
    }

    const videoResponse = await fetch(videoUrl, { headers });

    if (!videoResponse.ok) {
      return handleCors(new Response(videoResponse.body, { status: videoResponse.status, headers: videoResponse.headers }));
    }

    const responseHeaders = new Headers(videoResponse.headers);
    responseHeaders.set("Cache-Control", "public, max-age=3600");
    responseHeaders.set("Accept-Ranges", "bytes");

    const response = new Response(videoResponse.body, {
      status: videoResponse.status,
      headers: responseHeaders,
    });

    return handleCors(response);

  } catch (error) {
    console.error("FATAL PROXY ERROR:", error);
    const errorBody = JSON.stringify({ error: "Failed to proxy video." });
    return handleCors(new Response(errorBody, { status: 500 }));
  }
});
