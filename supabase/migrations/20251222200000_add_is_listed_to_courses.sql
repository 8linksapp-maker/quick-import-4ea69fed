ALTER TABLE public.courses
ADD COLUMN is_listed BOOLEAN DEFAULT TRUE NOT NULL;

-- Adiciona um comentário na coluna para documentação
COMMENT ON COLUMN public.courses.is_listed IS 'Determina se o curso/produto deve ser visível nas listagens da UI (ex: página de cursos, home). Produtos ocultos (como a Blog House) podem ter acesso controlado sem aparecer nas vitrines.';
