import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// Interface para os dados do usuário recebidos
interface UserData {
  email: string;
  role: string;
  course_id: string;
  data_ultimo_pagamento: string; // ex: "16/07/2024"
  tipo_plano: 'mensal' | 'anual' | 'vitalicio';
}

// Interface para os resultados do processamento
interface Result {
  status: 'success' | 'updated' | 'error';
  message: string;
}

serve(async (req) => {
  // Trata a requisição OPTIONS (preflight) para CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { users } = await req.json();

    if (!users || !Array.isArray(users)) {
      throw new Error('A lista de usuários é inválida.');
    }

    // CORREÇÃO: Usando a mesma variável de ambiente da função 'create-user'
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('CUSTOM_SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const results: Result[] = [];

    for (const userData of users as UserData) {
      const { email, role, course_id, data_ultimo_pagamento, tipo_plano } = userData;

      if (!email || !role || !course_id || (tipo_plano !== 'vitalicio' && !data_ultimo_pagamento) || !tipo_plano) {
        results.push({ status: 'error', message: `Dados incompletos para o email: ${email || 'desconhecido'}` });
        continue;
      }

      try {
        // --- Lógica de cálculo de data ---
        let expirationDate: Date | null = null;
        if (tipo_plano !== 'vitalicio') {
          const dateParts = data_ultimo_pagamento.split('/');
          if (dateParts.length !== 3) throw new Error(`Formato de data inválido, use DD/MM/AAAA: ${data_ultimo_pagamento}`);
          const [day, month, year] = dateParts;
          const paymentDate = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00Z`);
          if (isNaN(paymentDate.getTime())) throw new Error(`Data de pagamento inválida: ${data_ultimo_pagamento}`);

          switch (tipo_plano) {
            case 'mensal': expirationDate = new Date(paymentDate.setMonth(paymentDate.getMonth() + 1)); break;
            case 'anual': expirationDate = new Date(paymentDate.setFullYear(paymentDate.getFullYear() + 1)); break;
          }
        } else {
          expirationDate = null;
        }
        
        // --- Lógica de criação/busca de usuário ---
        const { data: existingUserId, error: rpcError } = await supabaseAdmin
          .rpc('get_user_id_by_email', { user_email: email })
          .single();
        
        if (rpcError) {
          // Se a função RPC falhar por qualquer motivo, pare o processo para esse usuário.
          throw rpcError;
        }

        let userId: string;
        let userJustCreated = false;

        if (existingUserId) {
          // Usuário encontrado, usa o ID retornado pela função RPC
          userId = existingUserId;
          const { error: updateUserError } = await supabaseAdmin.auth.admin.updateUserById(
             userId,
             { user_metadata: { role: role } }
          );
          if (updateUserError) throw updateUserError;

        } else {
          // Usuário não encontrado, cria um novo
          const { data: newUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
            email: email,
            email_confirm: true,
            user_metadata: { role: role }
          });

          if (createUserError) throw createUserError;
          userId = newUser.user.id;
          userJustCreated = true;

          const { error: resetPassError } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
            redirectTo: `${Deno.env.get('SITE_URL')}/reset-password`,
          });
          if (resetPassError) {
              console.error(`Falha ao enviar email de reset para ${email}:`, resetPassError.message);
          }
        }

        // --- Lógica de salvar curso ---
        // Alinhado com a função update-user-courses
        await supabaseAdmin
          .from('subscriptions')
          .upsert({
            user_id: userId,
            course_id: course_id,
            status: 'active',
            start_date: new Date().toISOString(),
            end_date: expirationDate ? expirationDate.toISOString() : null,
          }, { onConflict: 'user_id,course_id' });
        
        await supabaseAdmin
          .from('user_courses')
          .upsert({
            user_id: userId,
            course_id: course_id,
          }, { onConflict: 'user_id,course_id' });

        if (userJustCreated) {
            results.push({ status: 'success', message: `Usuário ${email} criado e acesso concedido.` });
        } else {
            results.push({ status: 'updated', message: `Acesso ao curso atualizado para ${email}.` });
        }

      } catch (error) {
        results.push({ status: 'error', message: `Erro ao processar ${email}: ${error.message}` });
      }
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
