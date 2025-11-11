-- Add the is_default column
ALTER TABLE public.prompts
ADD COLUMN is_default BOOLEAN NOT NULL DEFAULT FALSE;

-- Create a unique index to ensure only one default per user and type
-- Note: This allows multiple FALSE values but only one TRUE value for each (user_id, prompt_type) pair.
CREATE UNIQUE INDEX one_default_prompt_per_user_type
ON public.prompts (user_id, prompt_type, is_default)
WHERE (is_default = TRUE);

COMMENT ON COLUMN public.prompts.is_default IS 'Indicates if this is the default prompt for its type.';

-- We need a function to handle unsetting other defaults when a new one is set.
CREATE OR REPLACE FUNCTION handle_new_default_prompt() 
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = TRUE THEN
    UPDATE prompts
    SET is_default = FALSE
    WHERE user_id = NEW.user_id
      AND prompt_type = NEW.prompt_type
      AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically call the function
CREATE TRIGGER set_new_default_prompt_trigger
AFTER UPDATE OR INSERT ON prompts
FOR EACH ROW
EXECUTE FUNCTION handle_new_default_prompt();
