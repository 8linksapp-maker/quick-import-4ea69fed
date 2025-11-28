import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { S3Client, CopyObjectCommand, DeleteObjectCommand } from 'npm:@aws-sdk/client-s3@3.592.0';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { sourceKey, destinationKey } = await req.json();
    if (!sourceKey || !destinationKey) {
      throw new Error('sourceKey and destinationKey are required.');
    }
    
    if (sourceKey === destinationKey) {
      return new Response(JSON.stringify({ message: 'Source and destination are the same. No action taken.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

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

    // 1. Copy the object to the new key
    const copyCommand = new CopyObjectCommand({
      Bucket: cleanedBucketName,
      CopySource: `${cleanedBucketName}/${sourceKey}`,
      Key: destinationKey,
    });
    await s3Client.send(copyCommand);

    // 2. Delete the original object
    const deleteCommand = new DeleteObjectCommand({
      Bucket: cleanedBucketName,
      Key: sourceKey,
    });
    await s3Client.send(deleteCommand);

    // 3. Return the new URL
    const newUrl = `${cleanedPublicUrlBase}/${cleanedBucketName}/${destinationKey}`;

    return new Response(JSON.stringify({
      message: 'File renamed successfully.',
      newKey: destinationKey,
      newUrl: newUrl,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error renaming B2 file:', error);
    return new Response(JSON.stringify({ error: `Failed to rename file: ${error.message}` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
