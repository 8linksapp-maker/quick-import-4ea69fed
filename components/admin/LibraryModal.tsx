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

    const fetchFiles = async (token: string | null) => {
        setLoading(true);
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
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
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
                {error && <p className="text-red-500 text-center p-2">{error}</p>}
                
                <ul className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
                    {files.map(file => (
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
                    {!loading && files.length === 0 && !error && (
                        <p className="text-gray-400 text-center py-8">Nenhum vídeo encontrado na biblioteca.</p>
                    )}
                </ul>

                {loading && <p className="text-center">Carregando...</p>}

                {!loading && nextToken && (
                    <div className="text-center pt-4 border-t border-gray-700">
                        <button 
                            onClick={() => fetchFiles(nextToken)} 
                            className="bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 px-4 rounded-md disabled:opacity-50"
                            disabled={loading}
                        >
                            Carregar Mais
                        </button>
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default LibraryModal;
