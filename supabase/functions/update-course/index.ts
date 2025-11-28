import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  // This is needed if you're planning to invoke your function from a browser.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { id, ...updateData } = await req.json()
    const { kiwify_product_ids, ...courseData } = updateData;

    // Create a Supabase client with the service_role key
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('CUSTOM_SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Update the course details in the 'courses' table
    const { data: updatedCourse, error: courseError } = await supabaseClient
      .from('courses')
      .update(courseData)
      .eq('id', id)
      .select()
      .single();

    if (courseError) {
      throw courseError
    }

    // 2. Delete all existing links for this course
    const { error: deleteError } = await supabaseClient
        .from('course_kiwify_products')
        .delete()
        .eq('course_id', id);

    if (deleteError) {
        console.error('Error deleting old kiwify links:', deleteError);
        throw deleteError;
    }

    // 3. If there are new Kiwify product IDs, insert them into the linking table
    if (kiwify_product_ids && kiwify_product_ids.length > 0) {
      const linksToInsert = kiwify_product_ids.map((productId: string) => ({
        course_id: id,
        kiwify_product_id: productId,
      }));

      const { error: linksError } = await supabaseClient
        .from('course_kiwify_products')
        .insert(linksToInsert);

      if (linksError) {
        console.error('Error inserting new kiwify links:', linksError);
        throw linksError;
      }
    }

    return new Response(JSON.stringify({ data: updatedCourse }), {
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
