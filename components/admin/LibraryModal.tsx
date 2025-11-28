import React, { useState, useEffect } from 'react';
import { supabase } from '../../src/supabaseClient';
import Modal from '../Modal';

interface B2File {
    key: string;
    size: number;
    lastModified: string;
    url: string;
}

interface LibraryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onFileSelect: (file: B2File) => void;
}

const LibraryModal: React.FC<LibraryModalProps> = ({ isOpen, onClose, onFileSelect }) => {
    const [files, setFiles] = useState<B2File[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [nextToken, setNextToken] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);

    // Debounce search term
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
        }, 500); // 500ms delay

        return () => {
            clearTimeout(handler);
        };
    }, [searchTerm]);

    const fetchFiles = async (token: string | null) => {
        // When fetching new pages, we shouldn't show the "loading" state for the whole list,
        // just for the "load more" button, to avoid hiding existing results.
        // However, for the initial load, we do want a general loading state.
        if (!token) {
            setLoading(true);
        }
        setError(null);
        try {
            const { data, error: funcError } = await supabase.functions.invoke('list-b2-videos', {
                body: { continuationToken: token }
            });
            if (funcError) throw funcError;

            // Append new files if a token was used, otherwise replace
            setFiles(prev => token ? [...prev, ...data.files] : data.files);
            setNextToken(data.nextContinuationToken);

        } catch (err: any) {
            setError(`Falha ao carregar arquivos: ${err.message}`);
        } finally {
            if (!token) {
               setLoading(false);
            }
        }
    };
    
    const filteredFiles = files.filter(file =>
        file.key.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
    );

    // Effect to automatically fetch more if search yields no results
    useEffect(() => {
        if (debouncedSearchTerm && filteredFiles.length === 0 && nextToken && !loading) {
            // Check if we are not already in a loading state from another source
            const loadMoreButton = document.querySelector('#load-more-library');
            if (loadMoreButton && !loadMoreButton.hasAttribute('disabled')) {
                 fetchFiles(nextToken);
            }
        }
    }, [debouncedSearchTerm, filteredFiles, files, nextToken, loading]);


    useEffect(() => {
        if (isOpen) {
            // Reset search term when opening, and fetch initial files
            setSearchTerm('');
            fetchFiles(null);
        } else {
            // Reset state when modal is closed for a fresh start next time
            setFiles([]);
            setNextToken(null);
            setError(null);
        }
    }, [isOpen]);

    const handleSelect = (file: B2File) => {
        onFileSelect(file);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Selecionar Vídeo da Biblioteca">
            <div className="space-y-4">
                <input
                    type="text"
                    placeholder="Buscar pelo nome do arquivo..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-gray-900 border-gray-700 text-white rounded-md py-2 px-3 focus:ring-red-600 focus:border-red-600"
                />
                {error && <p className="text-red-500 text-center p-2">{error}</p>}
                
                <ul className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
                    {filteredFiles.map(file => (
                        <li 
                            key={file.key} 
                            onClick={() => handleSelect(file)}
                            className="p-3 bg-gray-800 rounded-md hover:bg-gray-700 cursor-pointer transition-colors"
                        >
                            <p className="font-semibold text-white truncate" title={file.key}>{file.key}</p>
                            <p className="text-sm text-gray-400">
                                {file.size ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : 'Tamanho desconhecido'}
                                <span className="mx-2">|</span>
                                {new Date(file.lastModified).toLocaleDateString()}
                            </p>
                        </li>
                    ))}
                    {loading && files.length === 0 && <p className="text-center py-8">Carregando biblioteca...</p>}
                    {!loading && filteredFiles.length === 0 && !error && (
                        <p className="text-gray-400 text-center py-8">
                            {debouncedSearchTerm 
                                ? `Nenhum vídeo encontrado com o termo "${debouncedSearchTerm}".`
                                : 'Nenhum vídeo encontrado na biblioteca.'
                            }
                        </p>
                    )}
                </ul>

                {!loading && nextToken && (
                    <div className="text-center pt-4 border-t border-gray-700">
                        <button 
                            id="load-more-library"
                            onClick={() => fetchFiles(nextToken)} 
                            className="bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 px-4 rounded-md disabled:opacity-50"
                        >
                            Carregar Mais
                        </button>
                    </div>
                )}
                 {loading && files.length > 0 && <p className="text-center pt-4">Carregando mais...</p>}
            </div>
        </Modal>
    );
};

export default LibraryModal;