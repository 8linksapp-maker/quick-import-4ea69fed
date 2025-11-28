import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  // This is needed if you're planning to invoke your function from a browser.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { course } = await req.json()
    const { kiwify_product_ids, ...courseData } = course;

    // Create a Supabase client with the service_role key
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('CUSTOM_SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Insert the course data into the 'courses' table
    const { data: newCourse, error: courseError } = await supabaseClient
      .from('courses')
      .insert([courseData])
      .select()
      .single(); // Use single to get the created course object back

    if (courseError) {
      throw courseError
    }

    // 2. If there are Kiwify product IDs, insert them into the linking table
    if (kiwify_product_ids && kiwify_product_ids.length > 0) {
      const linksToInsert = kiwify_product_ids.map((productId: string) => ({
        course_id: newCourse.id,
        kiwify_product_id: productId,
      }));

      const { error: linksError } = await supabaseClient
        .from('course_kiwify_products')
        .insert(linksToInsert);

      if (linksError) {
        // If linking fails, we might want to roll back the course creation,
        // but for now, we'll just log the error.
        console.error('Error linking kiwify products:', linksError);
        throw linksError;
      }
    }

    return new Response(JSON.stringify({ data: newCourse }), {
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
