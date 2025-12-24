import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient, User } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('CUSTOM_SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { query } = await req.json();
    
    let allUsers: User[] = [];
    let page = 1;
    const PAGE_SIZE = 100;
    let hasMore = true;

    while(hasMore) {
        const { data: { users: userBatch }, error } = await supabaseClient.auth.admin.listUsers({
            page: page,
            perPage: PAGE_SIZE
        });

        if (error) {
            throw error;
        }

        if (userBatch && userBatch.length > 0) {
            allUsers = allUsers.concat(userBatch);
            page++;
        } else {
            hasMore = false;
        }
    }

    let finalUsers = allUsers;

    if (query && query.trim() !== '') {
        const lowerCaseQuery = query.trim().toLowerCase();
        finalUsers = allUsers.filter(user => 
            (user.email && user.email.toLowerCase().includes(lowerCaseQuery)) ||
            (user.user_metadata?.name && user.user_metadata.name.toLowerCase().includes(lowerCaseQuery))
        );
    }
    
    return new Response(JSON.stringify({ users: finalUsers }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
