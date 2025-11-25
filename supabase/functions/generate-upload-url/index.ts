import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import {
  S3Client,
  PutObjectCommand
} from 'npm:@aws-sdk/client-s3@3.592.0';
import { getSignedUrl } from 'npm:@aws-sdk/s3-request-presigner@3.592.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

console.log(`Function "generate-upload-url" up and running!`);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const bodyText = await req.text();
    console.log("Raw body received:", bodyText);

    if (!bodyText) {
      throw new Error('Request body is empty. fileName and fileType are required in the JSON body.');
    }

    const { fileName, fileType } = JSON.parse(bodyText);
    if (!fileName || !fileType) {
      throw new Error('fileName e fileType são obrigatórios.');
    }

    // 1. Obter credenciais do B2 (mesma lógica de antes)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('CUSTOM_SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: apiConfigData, error: apiConfigError } = await supabaseClient
      .from('api_configs')
      .select('*')
      .eq('name', 'Backblaze B2')
      .single();

    if (apiConfigError || !apiConfigData || !apiConfigData.credentials) {
      throw new Error('Configurações do Backblaze B2 não encontradas.');
    }

    const { keyId, applicationKey, endpoint, bucketName, publicUrlBase, region } = apiConfigData.credentials;

    if (!keyId || !applicationKey || !endpoint || !bucketName || !publicUrlBase || !region) {
      throw new Error('Credenciais do Backblaze B2 incompletas.');
    }

    // 2. Inicializar o S3 Client
    const s3Client = new S3Client({
      credentials: {
        accessKeyId: keyId,
        secretAccessKey: applicationKey,
      },
      region: region,
      endpoint: `https://${endpoint}`,
      forcePathStyle: true, // Adicionado para compatibilidade
    });

    // 3. Criar uma chave única para o arquivo e o comando Put
    const fileKey = `${Date.now()}-${fileName.replace(/[\s()]/g, '_')}`;
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: fileKey,
      ContentType: fileType,
    });

    // 4. Gerar a URL de upload assinada (válida por 5 minutos)
    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });

    // 5. Construir a URL pública final do arquivo, limpando as variáveis para evitar erros
    const cleanedPublicUrlBase = publicUrlBase.trim().replace(/\/+$/, ''); // Remove espaços e barras no final
    const cleanedBucketName = bucketName.trim().replace(/^\/+|\/+$/g, '');   // Remove espaços e barras no início/fim
    const publicUrl = `${cleanedPublicUrlBase}/${cleanedBucketName}/${fileKey}`;

    // 6. Retornar ambas as URLs para o frontend, agora com uma versão para depuração
    return new Response(JSON.stringify({ uploadUrl, publicUrl, fileKey, functionVersion: "v2_fixed_url" }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Erro em generate-upload-url:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
