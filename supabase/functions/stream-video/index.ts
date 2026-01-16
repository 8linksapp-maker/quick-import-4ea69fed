import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';
import { S3Client, GetObjectCommand } from 'npm:@aws-sdk/client-s3@3.592.0';
import { getSignedUrl } from 'npm:@aws-sdk/s3-request-presigner@3.592.0';

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
  const serviceRoleKey = Deno.env.get('CUSTOM_SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("CRITICAL: Supabase environment variables SUPABASE_URL or SUPABASE_ANON_KEY are not set.");
    return handleCors(new Response(JSON.stringify({ error: "Server configuration error" }), { status: 500 }));
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
      console.error("Authentication failed for token.");
      return handleCors(new Response(JSON.stringify({ error: "Invalid or expired token" }), { status: 401 }));
    }

    // 3. Authenticated! Now fetch B2 credentials to generate a signed URL.
    // We use a Service Role client here to access the 'api_configs' table securely.
    const adminSupabase = createClient(supabaseUrl, serviceRoleKey!);
    
    const { data: apiConfigData, error: apiConfigError } = await adminSupabase
      .from('api_configs')
      .select('*')
      .eq('name', 'Backblaze B2')
      .single();

    if (apiConfigError || !apiConfigData || !apiConfigData.credentials) {
      console.error("Backblaze B2 config missing:", apiConfigError);
      // Fallback or error? For now error, as proxying is too slow.
      return handleCors(new Response(JSON.stringify({ error: "Storage configuration missing" }), { status: 500 }));
    }

    const { keyId, applicationKey, endpoint, bucketName, region } = apiConfigData.credentials;
    if (!keyId || !applicationKey || !endpoint || !bucketName || !region) {
         console.error("Incomplete B2 credentials.");
         return handleCors(new Response(JSON.stringify({ error: "Incomplete storage configuration" }), { status: 500 }));
    }

    // 4. Initialize S3 Client
    const s3Client = new S3Client({
      credentials: {
        accessKeyId: keyId,
        secretAccessKey: applicationKey,
      },
      region: region,
      endpoint: `https://${endpoint}`,
      forcePathStyle: true, 
    });

    const videoFile = atob(encodedFile);
    // Ensure we don't have leading slashes if the key shouldn't have them
    const fileKey = videoFile.startsWith('/') ? videoFile.substring(1) : videoFile;

    // 5. Generate Signed URL (valid for 1 hour)
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: fileKey,
    });

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    // 6. Redirect the client to the direct B2 URL
    const response = new Response(null, {
      status: 302,
      headers: {
        "Location": signedUrl,
      }
    });
    return handleCors(response);

  } catch (error) {
    console.error("FATAL STREAMING ERROR:", error);
    const errorBody = JSON.stringify({ error: "Failed to process video request." });
    return handleCors(new Response(errorBody, { status: 500 }));
  }
});