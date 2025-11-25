import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Use the service role key for admin-level operations.
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('CUSTOM_SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { lesson_id } = await req.json();

    if (!lesson_id) {
      throw new Error('O ID da aula é obrigatório.');
    }

    // TODO: Implementar a exclusão de arquivos de vídeo/thumbnail do B2 para evitar arquivos órfãos.
    // No momento, apenas o registro do banco de dados é excluído.

    const { error: deleteError } = await supabaseClient
      .from('lessons')
      .delete()
      .eq('id', lesson_id);

    if (deleteError) {
      throw new Error(`Falha ao deletar a aula: ${deleteError.message}`);
    }

    return new Response(JSON.stringify({ message: 'Aula deletada com sucesso.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
