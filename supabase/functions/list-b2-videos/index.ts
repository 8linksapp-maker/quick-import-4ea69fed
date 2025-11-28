import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { S3Client, ListObjectsV2Command } from 'npm:@aws-sdk/client-s3@3.592.0';
import { corsHeaders } from '../_shared/cors.ts';

const isVideo = (fileName: string): boolean => {
  const videoExtensions = ['.mp4', '.mov', '.avi', '.webm', '.mkv', '.flv'];
  return videoExtensions.some(ext => fileName.toLowerCase().endsWith(ext));
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('CUSTOM_SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: apiConfig, error: configError } = await supabaseAdminClient
      .from('api_configs')
      .select('credentials')
      .eq('name', 'Backblaze B2')
      .single();

    if (configError || !apiConfig) {
      throw new Error('Backblaze B2 configuration not found in the database.');
    }

    const b2Creds = apiConfig.credentials;
    const requiredKeys = ['keyId', 'applicationKey', 'endpoint', 'region', 'bucketName', 'publicUrlBase'];
    for (const key of requiredKeys) {
      if (!b2Creds[key]) {
        throw new Error(`Missing '${key}' in Backblaze B2 database configuration.`);
      }
    }

    const body = await req.json().catch(() => ({}));
    const { continuationToken } = body;

    const s3Client = new S3Client({
      credentials: {
        accessKeyId: b2Creds.keyId,
        secretAccessKey: b2Creds.applicationKey,
      },
      region: b2Creds.region,
      endpoint: `https://${b2Creds.endpoint}`,
      forcePathStyle: true,
    });

    const cleanedPublicUrlBase = b2Creds.publicUrlBase.trim().replace(/\/+$/, '');
    const cleanedBucketName = b2Creds.bucketName.trim().replace(/^\/+|\/+$/g, '');

    const command = new ListObjectsV2Command({
      Bucket: cleanedBucketName,
      MaxKeys: 50,
      ContinuationToken: continuationToken,
    });

    const response = await s3Client.send(command);
    
    const videoFiles = (response.Contents || [])
      .filter(file => file.Key && isVideo(file.Key))
      .map(file => ({
        key: file.Key,
        size: file.Size,
        lastModified: file.LastModified,
        url: `${cleanedPublicUrlBase}/${cleanedBucketName}/${file.Key}`
      }));

    return new Response(JSON.stringify({
      files: videoFiles,
      nextContinuationToken: response.NextContinuationToken,
      isTruncated: response.IsTruncated,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error listing B2 files:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
