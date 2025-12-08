import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { user: userData } = await req.json()

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('CUSTOM_SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const userToCreate = {
      email: userData.email,
      user_metadata: userData.user_metadata,
      email_confirm: true,
    };

    if (userData.password && userData.password.trim() !== '') {
      userToCreate.password = userData.password;
    }

    const { data, error } = await supabaseClient.auth.admin.createUser(userToCreate);

    if (error) {
      throw error
    }

    if (!userData.password || userData.password.trim() === '') {
      const { error: resetError } = await supabaseClient.auth.resetPasswordForEmail(userData.email, {
        redirectTo: `${Deno.env.get('SITE_URL')}/reset-password`,
      });

      if (resetError) {
        // We don't want to fail the whole request if the email fails,
        // but we should log it.
        console.error(`User created, but failed to send password set email to ${userData.email}:`, resetError);
      }
    }

    return new Response(JSON.stringify({ data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 201,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
