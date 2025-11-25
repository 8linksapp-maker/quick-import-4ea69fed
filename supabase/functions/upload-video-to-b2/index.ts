import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "npm:@aws-sdk/client-s3@3.592.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

console.log(`Function "upload-video-to-b2" up and running!`)

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('CUSTOM_SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: apiConfigData, error: apiConfigError } = await supabaseClient
      .from('api_configs')
      .select('*')
      .eq('name', 'Backblaze B2')
      .single();

    if (apiConfigError || !apiConfigData || !apiConfigData.credentials) {
      throw new Error('Configurações do Backblaze B2 não encontradas ou incompletas. Por favor, configure no painel de administração.');
    }

    const { keyId, applicationKey, endpoint, bucketName, publicUrlBase, region } = apiConfigData.credentials;

    // --- PASSO DE DEBUGGING APRIMORADO ---
    console.log("--- DEBUGGING: VERIFICANDO CREDENCIAIS DO BACKBLAZE B2 ---");
    const partialKeyId = keyId ? `${keyId.substring(0, 4)}...${keyId.substring(keyId.length - 4)}` : "N/A";
    const partialAppKey = applicationKey ? `${applicationKey.substring(0, 4)}...${applicationKey.substring(applicationKey.length - 4)}` : "N/A";
    console.log(`> Key ID (parcial): ${partialKeyId}`);
    console.log(`> App Key (parcial): ${partialAppKey}`);
    console.log(`> Endpoint: ${endpoint || 'N/A'}`);
    console.log(`> Bucket Name: ${bucketName || 'N/A'}`);
    console.log(`> Region: ${region || 'N/A'}`);
    console.log("-------------------------------------------------------------");
    // --- FIM DO DEBUGGING ---

    if (!keyId || !applicationKey || !endpoint || !bucketName || !publicUrlBase || !region) {
      throw new Error('Credenciais do Backblaze B2 incompletas. Verifique a configuração no painel de administração.');
    }

    const s3Client = new S3Client({
      credentials: {
        accessKeyId: keyId,
        secretAccessKey: applicationKey,
      },
      region: region,
      endpoint: `https://${endpoint}`,
    });

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const oldFileUrl = formData.get('oldFileUrl') as string | null;

    if (!file) {
      throw new Error('Nenhum arquivo enviado.');
    }

    if (oldFileUrl) {
      try {
        const oldFileKey = oldFileUrl.substring(oldFileUrl.lastIndexOf('/') + 1);
        
        if (oldFileKey && oldFileKey !== 'undefined' && oldFileKey !== 'null') {
          console.log(`Tentando deletar o arquivo antigo: ${oldFileKey}`);
          await s3Client.send(new DeleteObjectCommand({
            Bucket: bucketName,
            Key: oldFileKey,
          }));
          console.log(`Arquivo antigo ${oldFileKey} deletado com sucesso.`);
        } else {
            console.log(`oldFileKey inválida ou vazia: ${oldFileKey}. Não foi possível deletar.`);
        }
      } catch (deleteError) {
        console.error('Falha ao deletar o arquivo antigo:', deleteError);
      }
    }

    const fileKey = `${Date.now()}-${file.name.replace(/[\s()]/g, '_')}`;
    const fileBuffer = await file.arrayBuffer();

    console.log(`Tamanho do buffer do arquivo: ${fileBuffer.byteLength} bytes`);
    console.log(`Fazendo upload do novo arquivo: ${fileKey}`);
    
    await s3Client.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: fileKey,
      Body: new Uint8Array(fileBuffer),
      ContentType: file.type,
      ContentLength: fileBuffer.byteLength,
    }));

    console.log(`Arquivo ${fileKey} enviado com sucesso.`);

    const newPublicUrl = `${publicUrlBase}/${bucketName}/${fileKey}`;

    return new Response(JSON.stringify({ publicUrl: newPublicUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Erro na função de upload:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});