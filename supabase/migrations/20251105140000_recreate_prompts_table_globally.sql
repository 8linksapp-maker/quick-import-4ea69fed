-- Step 1: Drop the existing table to ensure a clean slate, including all related objects like indexes and triggers.
DROP TABLE IF EXISTS public.prompts CASCADE;

-- Step 2: Recreate the prompts table without the user_id column.
CREATE TABLE public.prompts (
    id bigint NOT NULL PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    prompt_type text NOT NULL, -- e.g., 'informational', 'commercial'
    prompt_text text NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.prompts IS 'Stores global prompts for AI article generation.';

-- Step 3: Create a partial unique index to ensure only one default prompt per prompt_type (globally).
CREATE UNIQUE INDEX one_global_default_per_type ON public.prompts (prompt_type) WHERE (is_default IS TRUE);

-- Step 4: Create the function to handle unsetting other defaults.
CREATE OR REPLACE FUNCTION handle_global_default_prompt_setting() 
RETURNS TRIGGER AS $$
BEGIN
  -- If the new/updated row is being set as the default
  IF NEW.is_default = TRUE THEN
    -- Set is_default to FALSE for all other prompts of the same type
    UPDATE public.prompts
    SET is_default = FALSE
    WHERE prompt_type = NEW.prompt_type
      AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create the trigger to call the function.
CREATE TRIGGER set_global_default_prompt_trigger
AFTER INSERT OR UPDATE OF is_default ON public.prompts
FOR EACH ROW
EXECUTE FUNCTION handle_global_default_prompt_setting();

-- Step 6: Remove Row-Level Security (RLS) policies as this is a global admin table.
-- First, disable RLS on the table.
ALTER TABLE public.prompts DISABLE ROW LEVEL SECURITY;

-- Then, drop any existing policies if they were created by mistake in previous versions.
DROP POLICY IF EXISTS "Users can view their own prompts" ON public.prompts;
DROP POLICY IF EXISTS "Users can insert their own prompts" ON public.prompts;
DROP POLICY IF EXISTS "Users can update their own prompts" ON public.prompts;
DROP POLICY IF EXISTS "Users can delete their own prompts" ON public.prompts;
