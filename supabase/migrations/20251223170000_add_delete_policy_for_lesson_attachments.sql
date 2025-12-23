CREATE POLICY "Allow authenticated users to delete attachments"
ON public.lesson_attachments FOR DELETE
TO authenticated
USING (true);
