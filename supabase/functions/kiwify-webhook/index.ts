import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload = await req.json()
    console.log("Payload received (partial):", JSON.stringify(payload).substring(0, 200));

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('CUSTOM_SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    let order = payload.order;
    if (!order && payload.order_status) {
        order = payload;
    }

    if (!order) {
      console.error("Missing 'order' object.");
      return new Response(JSON.stringify({ error: "Missing 'order'" }), { status: 400, headers: corsHeaders });
    }

    if (order.order_status !== 'paid') {
      console.log(`Status: ${order.order_status}. Ignored.`);
      return new Response(JSON.stringify({ message: 'Ignored' }), { status: 200, headers: corsHeaders });
    }

    const customerEmail = order.Customer.email.replace(/\s/g, '');
    const customerName = order.Customer.full_name || order.Customer.first_name || 'Aluno Kiwify';
    // Garantindo limpeza do ID
    const kiwifyProductId = (order.Product.product_id || '').trim();
    
    console.log(`Processing: ${customerEmail} | ProductID: '${kiwifyProductId}'`);

    // 1. User Handling
    let userId: string;

    const { data: newUser, error: createUserError } = await supabaseClient.auth.admin.createUser({
        email: customerEmail,
        email_confirm: true,
        app_metadata: { role: 'User' },
        user_metadata: { 
            name: customerName, 
            role: 'User'
        }
    });

    if (createUserError) {
        console.log(`User exists/error: ${createUserError.message}. Retrieving...`);
        const { data: linkData } = await supabaseClient.auth.admin.generateLink({
            type: 'magiclink',
            email: customerEmail
        });

        if (!linkData?.user) {
             console.error("Failed to recover user.");
             return new Response(JSON.stringify({ error: "User error" }), { status: 200, headers: corsHeaders });
        }
        userId = linkData.user.id;
    } else {
        userId = newUser.user.id;
        console.log(`User Created: ${userId}`);
        
        // CORREÇÃO AQUI: URL HARDCODED para garantir o redirecionamento correto
        await supabaseClient.auth.resetPasswordForEmail(customerEmail, {
            redirectTo: 'https://seoflix.vercel.app/reset-password',
        });
    }

    // --- FORCE UPDATE METADATA ---
    console.log(`FORCE UPDATING User ${userId} metadata...`);
    await supabaseClient.auth.admin.updateUserById(userId, {
        app_metadata: { role: 'User' }, 
        user_metadata: { 
            name: customerName, 
            role: 'User',
            source: 'kiwify_webhook',
            updated_at_webhook: new Date().toISOString()
        }
    });

    // 2. Course Linking
    console.log(`Searching course for product '${kiwifyProductId}' in course_kiwify_products...`);
    
    const { data: courseLinks, error: mapError } = await supabaseClient
      .from('course_kiwify_products')
      .select('course_id')
      .eq('kiwify_product_id', kiwifyProductId)
      .limit(1);

    if (mapError) console.error("DB Error:", mapError);

    const courseLink = courseLinks?.[0];

    if (!courseLink) {
        console.warn(`Product '${kiwifyProductId}' NOT FOUND in course_kiwify_products.`);
        return new Response(JSON.stringify({ message: "User OK, Course Not Mapped" }), { status: 200, headers: corsHeaders });
    }

    const courseId = courseLink.course_id;
    console.log(`Found! Mapped to Course ID: ${courseId}`);

    // 3. Subscription & Access
    const accessUntil = order.Subscription?.customer_access?.access_until;
    const endDate = accessUntil ? accessUntil : new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString();

    await supabaseClient.from('subscriptions').upsert({
            user_id: userId,
            course_id: courseId,
            status: 'active',
            start_date: new Date().toISOString(),
            end_date: endDate,
        }, { onConflict: 'user_id,course_id' });

    const { error: userCourseError } = await supabaseClient.from('user_courses').upsert({
            user_id: userId,
            course_id: courseId,
        }, { onConflict: 'user_id,course_id' });

    if (userCourseError) {
        console.error("Access Grant Error:", userCourseError);
        return new Response(JSON.stringify({ error: "Access Grant Error" }), { status: 500, headers: corsHeaders });
    }
    
    console.log(`Access Granted Successfully to Course ${courseId}.`);

    return new Response(JSON.stringify({ message: 'Success' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })

  } catch (error) {
    console.error("Exception:", error);
    return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 })
  }
})
