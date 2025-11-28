import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  // This is needed if you're planning to invoke your function from a browser.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create a Supabase client with the service_role key
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('CUSTOM_SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data, error } = await supabaseClient
      .from('courses')
      .select(`
        *,
        kiwify_product_ids:course_kiwify_products(kiwify_product_id)
      `)

    if (error) {
      throw error
    }

    // The data from Supabase will have a nested structure for the product IDs.
    // We'll flatten it to match the frontend's expectation.
    const formattedData = data.map(course => ({
      ...course,
      kiwify_product_ids: course.kiwify_product_ids.map((p: any) => p.kiwify_product_id)
    }));

    return new Response(JSON.stringify({ data: formattedData }), {
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
