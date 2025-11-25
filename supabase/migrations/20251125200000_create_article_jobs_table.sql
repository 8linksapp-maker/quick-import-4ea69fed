CREATE TABLE article_jobs (
    id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    created_at timestamptz DEFAULT now() NOT NULL,
    user_id uuid REFERENCES auth.users(id) NOT NULL,
    site_id bigint REFERENCES wp_sites(id) ON DELETE CASCADE NOT NULL,
    status text DEFAULT 'pending' NOT NULL,
    outlines text NOT NULL,
    generated_title text,
    generated_introduction text,
    generated_body text,
    final_post_id bigint,
    error_message text
);

-- RLS Policies for article_jobs
ALTER TABLE article_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own article jobs"
ON article_jobs
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own article jobs"
ON article_jobs
FOR INSERT WITH CHECK (auth.uid() = user_id);
