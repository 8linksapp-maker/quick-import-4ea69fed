-- Create the table to store VPS credentials
CREATE TABLE public.vps_credentials (
    id bigint NOT NULL PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    host text NOT NULL,
    port integer NOT NULL DEFAULT 22,
    username text NOT NULL,
    encrypted_password text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Add comments to the table and columns
COMMENT ON TABLE public.vps_credentials IS 'Stores encrypted VPS credentials for users.';
COMMENT ON COLUMN public.vps_credentials.user_id IS 'The user who owns these credentials.';
COMMENT ON COLUMN public.vps_credentials.encrypted_password IS 'The encrypted password or private key for the VPS. Encryption is handled by the application.';

-- Enable Row-Level Security
ALTER TABLE public.vps_credentials ENABLE ROW LEVEL SECURITY;

-- Create policies to restrict access
CREATE POLICY "Users can view their own VPS credentials"
ON public.vps_credentials
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own VPS credentials"
ON public.vps_credentials
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own VPS credentials"
ON public.vps_credentials
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own VPS credentials"
ON public.vps_credentials
FOR DELETE
USING (auth.uid() = user_id);
