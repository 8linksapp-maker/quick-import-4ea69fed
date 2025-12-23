
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { decode } from 'https://deno.land/std@0.177.0/encoding/base64.ts';

const B2_BUCKET_NAME = 'lessons-attachments';

serve(async (req) => {
    // Check for CORS preflight request
    if (req.method === 'OPTIONS') {
        return new Response('ok', {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
            },
        });
    }

    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        );

        const { lesson_id, attachmentFiles } = await req.json();

        if (!lesson_id || !attachmentFiles || !Array.isArray(attachmentFiles)) {
            return new Response(JSON.stringify({ error: 'lesson_id e um array de attachmentFiles são obrigatórios.' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const uploadedAttachments = [];

        for (const fileData of attachmentFiles) {
            const { fileName, fileBody, fileType } = fileData;
            
            // Generate a unique file path
            const filePath = `${lesson_id}/${Date.now()}-${fileName}`;

            // Decode the base64 file body
            const decodedFile = decode(fileBody);

            // Upload the file to Supabase Storage (acting as a proxy to B2)
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from(B2_BUCKET_NAME)
                .upload(filePath, decodedFile, {
                    contentType: fileType,
                    cacheControl: '3600',
                    upsert: false,
                });

            if (uploadError) {
                console.error('Erro no upload para o storage:', uploadError);
                throw new Error(`Falha no upload do arquivo ${fileName}: ${uploadError.message}`);
            }

            // Get the public URL of the uploaded file
            const { data: publicUrlData } = supabase.storage
                .from(B2_BUCKET_NAME)
                .getPublicUrl(filePath);

            if (!publicUrlData) {
                throw new Error(`Não foi possível obter a URL pública para o arquivo ${fileName}.`);
            }
            const publicUrl = publicUrlData.publicUrl;

            // Insert the file metadata into the 'lesson_attachments' table
            const { data: dbData, error: dbError } = await supabase
                .from('lesson_attachments')
                .insert({
                    lesson_id: lesson_id,
                    file_name: fileName,
                    file_url: publicUrl,
                })
                .select()
                .single();

            if (dbError) {
                console.error('Erro ao inserir no banco de dados:', dbError);
                // Attempt to delete the just-uploaded file to avoid orphans
                await supabase.storage.from(B2_BUCKET_NAME).remove([filePath]);
                throw new Error(`Falha ao registrar o anexo ${fileName} no banco de dados: ${dbError.message}`);
            }

            uploadedAttachments.push(dbData);
        }

        return new Response(JSON.stringify({ attachments: uploadedAttachments }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });

    } catch (error) {
        console.error('Erro no processamento da função:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
    }
});
