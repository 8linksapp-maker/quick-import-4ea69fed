CREATE TABLE public.wp_sites (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    site_url text NOT NULL,
    wp_username text NOT NULL,
    encrypted_application_password text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT wp_sites_pkey PRIMARY KEY (id)
);

ALTER TABLE public.wp_sites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own WP sites." ON public.wp_sites
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own WP sites." ON public.wp_sites
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own WP sites." ON public.wp_sites
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own WP sites." ON public.wp_sites
    FOR DELETE USING (auth.uid() = user_id);
