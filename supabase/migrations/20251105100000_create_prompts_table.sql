CREATE TABLE public.prompts (
    id bigint NOT NULL PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    prompt_type text NOT NULL, -- e.g., 'informational', 'commercial'
    prompt_text text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, prompt_type)
);

COMMENT ON TABLE public.prompts IS 'Stores user-defined prompts for AI article generation.';

ALTER TABLE public.prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own prompts" ON public.prompts
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own prompts" ON public.prompts
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own prompts" ON public.prompts
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own prompts" ON public.prompts
FOR DELETE USING (auth.uid() = user_id);
