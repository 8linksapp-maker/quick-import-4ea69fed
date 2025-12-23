import React, { useState, useEffect } from 'react';
import { supabase } from '../../../src/supabaseClient';
import FileUpload from '../FileUpload';

interface EditModuleFormProps {
    moduleId: number;
    onModuleUpdated: () => void;
    onCancel: () => void;
}

const EditModuleForm: React.FC<EditModuleFormProps> = ({ moduleId, onModuleUpdated, onCancel }) => {
    const [title, setTitle] = useState('');
    const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
    const [releaseDate, setReleaseDate] = useState('');
    const [daysAfterEnrollment, setDaysAfterEnrollment] = useState('');
    
    const [loading, setLoading] = useState(false);
    const [formLoading, setFormLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchModule = async () => {
            setFormLoading(true);
            const { data, error } = await supabase
                .from('modules')
                .select('title, thumbnail_url, release_date, days_after_enrollment')
                .eq('id', moduleId)
                .single();
            
            if (error) {
                setError('Failed to fetch module data.');
            } else if (data) {
                setTitle(data.title);
                setThumbnailUrl(data.thumbnail_url);
                // Format date for input[type="date"], which expects YYYY-MM-DD
                setReleaseDate(data.release_date ? new Date(data.release_date).toISOString().split('T')[0] : '');
                setDaysAfterEnrollment(data.days_after_enrollment || '');
            }
            setFormLoading(false);
        };
        fetchModule();
    }, [moduleId]);

    const handleReleaseDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setReleaseDate(e.target.value);
        if (e.target.value) {
            setDaysAfterEnrollment(''); // Clear the other field
        }
    };

    const handleDaysChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setDaysAfterEnrollment(e.target.value);
        if (e.target.value) {
            setReleaseDate(''); // Clear the other field
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const updateData = {
            title,
            thumbnail_url: thumbnailUrl,
            release_date: releaseDate || null,
            days_after_enrollment: daysAfterEnrollment ? parseInt(daysAfterEnrollment, 10) : null,
        };

        const { error: updateError } = await supabase
            .from('modules')
            .update(updateData)
            .eq('id', moduleId);

        setLoading(false);
        if (updateError) {
            setError(updateError.message);
        } else {
            onModuleUpdated();
        }
    };

    if (formLoading) {
        return <p>Carregando editor de módulo...</p>;
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <h4 className="text-xl font-bold text-white">Editar Módulo</h4>
            
            <div>
                <label htmlFor="moduleTitle" className="block text-sm font-medium text-gray-300 mb-2">Título do Módulo</label>
                <input
                    id="moduleTitle"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-black/20 border border-white/20 rounded-md py-2 px-4 text-white"
                    required
                />
            </div>

            <FileUpload 
                label="Nova Thumbnail (opcional)"
                bucketName="course_assets"
                onUpload={(url) => setThumbnailUrl(url)}
            />
            {thumbnailUrl && <img src={thumbnailUrl} alt="Thumbnail preview" className="w-40 h-auto rounded-md" />}

            <div className="border-t border-white/10 pt-6">
                <h5 className="text-lg font-semibold text-white mb-1">Liberação Programada (Drip)</h5>
                <p className="text-xs text-gray-400 mb-4">Preencha apenas um dos campos abaixo. Se ambos estiverem vazios, o módulo é liberado imediatamente.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="daysAfter" className="block text-sm font-medium text-gray-300 mb-2">Liberar após X dias da compra</label>
                        <input
                            id="daysAfter"
                            type="number"
                            placeholder="Ex: 7"
                            value={daysAfterEnrollment}
                            onChange={handleDaysChange}
                            className="w-full bg-black/20 border border-white/20 rounded-md py-2 px-4 text-white"
                        />
                    </div>
                    <div>
                        <label htmlFor="releaseDate" className="block text-sm font-medium text-gray-300 mb-2">Liberar em data específica</label>
                        <input
                            id="releaseDate"
                            type="date"
                            value={releaseDate}
                            onChange={handleReleaseDateChange}
                            className="w-full bg-black/20 border border-white/20 rounded-md py-2 px-4 text-white"
                        />
                    </div>
                </div>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex justify-end space-x-4 pt-4">
                <button type="button" onClick={onCancel} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-md transition-colors">
                    Cancelar
                </button>
                <button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                    {loading ? 'Salvando...' : 'Salvar Alterações'}
                </button>
            </div>
        </form>
    );
};

export default EditModuleForm;
