// supabase/functions/delete-lesson-attachment/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
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

        const { attachment_id } = await req.json();

        if (!attachment_id) {
            return new Response(JSON.stringify({ error: 'attachment_id é obrigatório.' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // First, get the file url from the database
        const { data: attachment, error: fetchError } = await supabase
            .from('lesson_attachments')
            .select('file_url')
            .eq('id', attachment_id)
            .single();

        if (fetchError || !attachment) {
            throw new Error(fetchError?.message || `Anexo com ID ${attachment_id} não encontrado.`);
        }

        // Extract file path from URL
        const BUCKET_NAME = 'lessons-attachments';
        const urlParts = attachment.file_url.split(`/${BUCKET_NAME}/`);
        if (urlParts.length < 2) {
            // If the URL format is unexpected, we might not be able to delete from storage,
            // but we should still proceed to delete the database record.
            console.error(`Formato de URL de anexo inválido, não foi possível extrair o caminho do arquivo: ${attachment.file_url}`);
        } else {
            const filePath = urlParts[1];
            // Then, delete the file from storage
            const { error: storageError } = await supabase.storage
                .from(BUCKET_NAME)
                .remove([filePath]);

            if (storageError) {
                // Log the error but proceed to delete the DB record anyway to avoid orphans
                console.error(`Não foi possível deletar o arquivo do storage (path: ${filePath}): ${storageError.message}`);
            }
        }

        // Finally, delete the record from the database
        const { error: dbError } = await supabase
            .from('lesson_attachments')
            .delete()
            .eq('id', attachment_id);

        if (dbError) {
            throw new Error(`Falha ao deletar o registro do anexo do banco de dados: ${dbError.message}`);
        }

        return new Response(JSON.stringify({ message: 'Anexo deletado com sucesso.' }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });

    } catch (error) {
        console.error('Erro na função de deletar anexo:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
    }
});
