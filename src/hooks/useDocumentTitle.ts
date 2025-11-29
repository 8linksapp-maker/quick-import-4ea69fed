import { useEffect } from 'react';

const useDocumentTitle = (title: string) => {
  useEffect(() => {
    document.title = `${title} - Seoflix`;
  }, [title]);
};

export default useDocumentTitle;
