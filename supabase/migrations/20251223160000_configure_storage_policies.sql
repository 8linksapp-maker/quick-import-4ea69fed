-- Políticas para o Bucket 'lessons-attachments' (Storage)

-- 1. Permitir que anon/authenticated façam upload (INSERT) no bucket 'lessons-attachments'
INSERT INTO storage.policies (bucket_id, name, definition, path_expression, permissions, allowed_roles) VALUES
('lessons-attachments', 'Allow anon/authenticated uploads', 'true', '/lesson_id/*', '{INSERT}', '{anon, authenticated}');

-- 2. Permitir que anon/authenticated façam download (SELECT) do bucket 'lessons-attachments'
INSERT INTO storage.policies (bucket_id, name, definition, path_expression, permissions, allowed_roles) VALUES
('lessons-attachments', 'Allow anon/authenticated downloads', 'true', '/lesson_id/*', '{SELECT}', '{anon, authenticated}');

-- Nota: O 'path_expression' '/lesson_id/*' assume que seus arquivos são armazenados
-- no formato 'lessons-attachments/lesson_id/nome_do_arquivo'. Se o seu
-- formato de caminho for diferente (ex: 'lessons-attachments/alguma_pasta/nome_do_arquivo'),
-- você precisará ajustar o 'path_expression' adequadamente.
