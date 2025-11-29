import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload = await req.json()
    console.log("Kiwify webhook payload received:", payload);

    // The actual order data is nested inside the 'order' object
    const order = payload.order;
    if (!order) {
      throw new Error("Payload does not contain 'order' object");
    }

    // Check if the order status is 'paid'
    if (order.order_status !== 'paid') {
      return new Response(JSON.stringify({ message: 'Order status is not paid, ignoring.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('CUSTOM_SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const customerEmail = order.Customer.email.replace(/\s/g, '');
    const kiwifyProductId = order.Product.product_id
    console.log(`Processing paid order for email: ${customerEmail} and product ID: ${kiwifyProductId}`);



    // 1. Find or create the user
    let userId: string;
    const { data: existingUser, error: getUserError } = await supabaseClient
        .from('users')
        .select('id')
        .eq('email', customerEmail)
        .single();

    if (getUserError && getUserError.code !== 'PGRST116') { // 'PGRST116' is "Row not found"
        console.error("Error fetching user:", getUserError);
        throw getUserError;
    }

    if (existingUser) {
        userId = existingUser.id;
        console.log(`Found existing user with ID: ${userId}`);
    } else {
        console.log(`User with email ${customerEmail} not found. Creating new user.`);
        const { data: newUser, error: createUserError } = await supabaseClient.auth.admin.createUser({
            email: customerEmail,
            email_confirm: true, // Email is verified by purchase
        });

        if (createUserError) {
            console.error("Error creating user:", createUserError);
            throw createUserError;
        }
        userId = newUser.user.id;
        console.log(`Created new user with ID: ${userId}`);
    }

    // 2. Find the course associated with the Kiwify Product ID
    const { data: courseLink, error: courseLinkError } = await supabaseClient
      .from('course_kiwify_products')
      .select('course_id')
      .eq('kiwify_product_id', kiwifyProductId)
      .single()

    if (courseLinkError) {
      console.error(`Error finding course link for kiwify_product_id ${kiwifyProductId}:`, courseLinkError);
      throw courseLinkError
    }
    const courseId = courseLink.course_id;
    console.log(`Found course with ID: ${courseId}`);

    // 3. Upsert the subscription
    const subscriptionData = {
        user_id: userId,
        course_id: courseId,
        status: 'active',
        start_date: new Date().toISOString(),
        end_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(),
    };

    const { error: subscriptionError } = await supabaseClient
        .from('subscriptions')
        .upsert(subscriptionData, { onConflict: 'user_id,course_id' });

    if (subscriptionError) {
        console.error("Error upserting subscription:", subscriptionError);
        throw subscriptionError
    }
    console.log("Subscription upserted successfully.");

    // 4. Grant user access to the course (upsert)
    const userCourseData = {
        user_id: userId,
        course_id: courseId,
    };
    const { error: userCourseError } = await supabaseClient
        .from('user_courses')
        .upsert(userCourseData, { onConflict: 'user_id,course_id' });

    if (userCourseError) {
        console.error("Error upserting user_course:", userCourseError);
        throw userCourseError
    }
    console.log("User course access granted successfully.");

    return new Response(JSON.stringify({ message: 'Webhook processed successfully' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error("Webhook processing failed:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})