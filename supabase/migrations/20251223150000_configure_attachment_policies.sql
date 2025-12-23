-- Políticas para a Tabela 'lesson_attachments'

-- 1. Habilitar Row Level Security (RLS) para a tabela public.lesson_attachments
ALTER TABLE public.lesson_attachments ENABLE ROW LEVEL SECURITY;

-- 2. Criar uma política para permitir a inserção de novas linhas na tabela public.lesson_attachments
CREATE POLICY "Allow anon/authenticated to insert lesson attachments"
ON public.lesson_attachments FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- 3. Criar uma política para permitir leitura (SELECT) da tabela public.lesson_attachments
CREATE POLICY "Allow anon/authenticated to select lesson attachments"
ON public.lesson_attachments FOR SELECT
TO anon, authenticated
USING (true);