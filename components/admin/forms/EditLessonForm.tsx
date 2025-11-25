import React, { useState, useEffect } from 'react';
import { supabase } from '../../../src/supabaseClient';
import KiwifyUploader from '../../KiwifyUploader';
import ConfirmModal from '../ConfirmModal';
import LibraryModal from '../LibraryModal';

interface EditLessonFormProps {
    lessonId: number;
    onLessonUpdated: () => void;
    onCancel: () => void;
}

const generateThumbnail = (videoFile: File, seekTime: number = 2): Promise<Blob> => {
    console.log('generateThumbnail: Iniciado com videoFile:', videoFile, 'seekTime:', seekTime);
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        video.src = URL.createObjectURL(videoFile);
        video.currentTime = seekTime;
        video.onseeked = () => {
            console.log('generateThumbnail: video seeked.');
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                canvas.toBlob(blob => {
                    URL.revokeObjectURL(video.src);
                    if (blob) {
                        console.log('generateThumbnail: canvas to blob successful.');
                        resolve(blob);
                    } else {
                        console.error('generateThumbnail: Canvas to Blob conversion failed.');
                        reject(new Error('Canvas to Blob conversion failed'));
                    }
                }, 'image/jpeg', 0.8);
            } else {
                console.error('generateThumbnail: Could not get canvas context.');
                reject(new Error('Could not get canvas context'));
            }
        };
        video.onerror = (e) => {
            console.error('generateThumbnail: Erro no vídeo:', e);
            reject(e);
        };
        video.load();
    });
};

const generateThumbnailFromUrl = (videoUrl: string, seekTime: number = 2): Promise<Blob> => {
    console.log('generateThumbnailFromUrl: Iniciado com videoUrl:', videoUrl, 'seekTime:', seekTime);
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        video.crossOrigin = "anonymous"; // Required for cross-origin resources
        video.src = videoUrl;
        
        const onSeeked = () => {
            console.log('generateThumbnailFromUrl: video seeked to:', video.currentTime);
            // Using a short timeout to ensure the frame is ready.
            setTimeout(() => {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                        canvas.toBlob(blob => {
                            if (blob) {
                                console.log('generateThumbnailFromUrl: canvas to blob successful.');
                                resolve(blob);
                            } else {
                                console.error('generateThumbnailFromUrl: Canvas to Blob conversion failed.');
                                reject(new Error('A conversão do canvas para Blob falhou.'));
                            }
                        }, 'image/jpeg', 0.8);
                    } else {
                        console.error('generateThumbnailFromUrl: Could not get canvas context.');
                        reject(new Error('Não foi possível obter o contexto do canvas.'));
                    }
                } catch (e) {
                     console.error('generateThumbnailFromUrl: Erro no processamento do canvas:', e);
                     reject(new Error('Erro ao processar o frame do vídeo no canvas.'));
                } finally {
                    video.removeEventListener('loadedmetadata', onMetadataLoaded);
                    video.removeEventListener('seeked', onSeeked);
                    video.removeEventListener('error', onError);
                }
            }, 100);
        };

        const onMetadataLoaded = () => {
            console.log('generateThumbnailFromUrl: video metadata loaded.');
            video.currentTime = seekTime;
        };

        const onError = (e: Event | string) => {
            console.error('generateThumbnailFromUrl: Erro no elemento de vídeo. Provavelmente um problema de CORS na B2.', e);
            reject(new Error('Erro ao carregar o vídeo. Verifique se a configuração de CORS do seu bucket na Backblaze B2 está correta.'));
        };

        video.addEventListener('loadedmetadata', onMetadataLoaded);
        video.addEventListener('seeked', onSeeked);
        video.addEventListener('error', onError);
        
        video.load();
    });
};


const EditLessonForm: React.FC<EditLessonFormProps> = ({ lessonId, onLessonUpdated, onCancel }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [releaseDays, setReleaseDays] = useState(0);
    const [releaseDate, setReleaseDate] = useState('');
    const [releaseType, setReleaseType] = useState('immediate');
    const [isDurationLimited, setIsDurationLimited] = useState(false);
    const [isChangingVideo, setIsChangingVideo] = useState(false);
    
    const [currentVideoUrl, setCurrentVideoUrl] = useState('');
    const [currentThumbnailUrl, setCurrentThumbnailUrl] = useState<string | null>(null);

    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [thumbFile, setThumbFile] = useState<File | null>(null);
    const [customThumbPreview, setCustomThumbPreview] = useState<string | null>(null);
    const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
    const [transcript, setTranscript] = useState('');
    
    const [formLoading, setFormLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [statusText, setStatusText] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [isLibraryModalOpen, setIsLibraryModalOpen] = useState(false);
    
        useEffect(() => {
            console.log('EditLessonForm useEffect: fetching lesson...');
            const fetchLesson = async () => {
                setFormLoading(true);
                const { data, error } = await supabase.from('lessons').select('*').eq('id', lessonId).single();
                if (data) {
                    console.log('EditLessonForm useEffect: Lesson data fetched:', data);
                    setTitle(data.title);
                    setDescription(data.description || '');
                    setReleaseDays(data.release_days || 0);
                    setTranscript(data.transcript || '');
                    setCurrentVideoUrl(data.video_url || '');
                    setCurrentThumbnailUrl(data.thumbnail_url || null);
    
                    if (data.release_days > 0) {
                        setReleaseType('days');
                    } else {
                        setReleaseType('immediate');
                    }
                } else {
                    console.error('EditLessonForm useEffect: Erro ao buscar dados da aula:', error);
                    setError(error?.message || 'Failed to fetch lesson data.');
                }
                setFormLoading(false);
            };
            fetchLesson();
        }, [lessonId]);
    
        const handleVideoFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
            console.log('handleVideoFileSelect: Arquivo selecionado.', e.target.files?.[0]);
            const file = e.target.files?.[0];
            if (file) setVideoFile(file);
        };
    
        const handleThumbFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
            console.log('handleThumbFileSelect: Thumbnail selecionada.', e.target.files?.[0]);
            const file = e.target.files?.[0];
            if (file) {
                setThumbFile(file);
                const reader = new FileReader();
                reader.onloadend = () => setCustomThumbPreview(reader.result as string);
                reader.readAsDataURL(file);
            }
        };
        
        const handleAttachmentFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            console.log('handleAttachmentFilesChange: Anexos selecionados.', e.target.files);
            if (e.target.files) {
                const newFiles = Array.from(e.target.files);
                setAttachmentFiles(prev => [...prev, ...newFiles].slice(0, 10));
            }
        };
    
        const handleTranscriptFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            console.log('handleTranscriptFileChange: Arquivo de transcrição selecionado.', e.target.files?.[0]);
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => setTranscript(event.target?.result as string);
            reader.readAsText(file);
        };
    
        const handleDirectUpload = async (
            fileToUpload: File | Blob,
            fileName: string,
            onProgress: (progress: number) => void
        ): Promise<string> => {
            console.log('handleDirectUpload: Iniciado para fileName:', fileName, 'fileType:', fileToUpload.type);
            const fileType = fileToUpload.type;
    
                    const { data, error: generateUrlError } = await supabase.functions.invoke('generate-upload-url', {
                        body: {
                            fileName: fileName,
                            fileType: fileType,
                        }
                    });
            
                            if (generateUrlError) {
                                console.error('handleDirectUpload: Erro em generate-upload-url:', generateUrlError);
                                throw new Error(`Erro ao gerar URL de upload: ${generateUrlError.message}`);
                            }            
                            console.log('handleDirectUpload: URL de upload gerada:', data);
                            const { uploadUrl, publicUrl } = data;
    
            if (!uploadUrl || !publicUrl) {
                console.error('handleDirectUpload: URL de upload ou URL pública não recebida da função.');
                throw new Error('URL de upload ou URL pública não recebida da função.');
            }
    
            return new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.open('PUT', uploadUrl);
                xhr.setRequestHeader('Content-Type', fileType);
    
                xhr.upload.onprogress = (event) => {
                    if (event.lengthComputable) {
                        const progress = Math.round((event.loaded / event.total) * 100);
                        onProgress(progress);
                        // console.log('handleDirectUpload: Upload de:', fileName, 'progresso:', progress, '%'); // Too noisy
                    }
                };
    
                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        console.log('handleDirectUpload: Upload de:', fileName, 'finalizado com sucesso. Public URL:', publicUrl);
                        resolve(publicUrl);
                    } else {
                        console.error('handleDirectUpload: Falha no upload direto para B2:', xhr.status, xhr.statusText);
                        reject(new Error(`Falha no upload direto para B2: ${xhr.status} - ${xhr.statusText}`));
                    }
                };
    
                xhr.onerror = () => {
                    console.error('handleDirectUpload: Erro de rede durante o upload direto para B2.');
                    reject(new Error('Erro de rede durante o upload direto para B2.'));
                };
    
                xhr.send(fileToUpload);
            });
        };

        const getSanitizedBaseFileName = async () => {
            console.log('getSanitizedBaseFileName: Iniciado.');
            const { data: initialLessonData, error: lessonError } = await supabase.from('lessons').select('module_id').eq('id', lessonId).single();
            if (lessonError || !initialLessonData) {
                console.error('getSanitizedBaseFileName: Erro ao buscar aula:', lessonError);
                throw new Error(`Falha ao buscar a aula: ${lessonError?.message}`);
            }
    
            const { data: moduleData, error: moduleError } = await supabase.from('modules').select('title, course_id').eq('id', initialLessonData.module_id).single();
            if (moduleError || !moduleData) {
                console.error('getSanitizedBaseFileName: Erro ao buscar módulo:', moduleError);
                throw new Error(`Falha ao buscar o módulo: ${moduleError?.message}`);
            }
    
            const { data: courseData, error: courseError } = await supabase.from('courses').select('title').eq('id', moduleData.course_id).single();
            if (courseError || !courseData) {
                console.error('getSanitizedBaseFileName: Erro ao buscar curso:', courseError);
                throw new Error(`Falha ao buscar o curso: ${courseError?.message}`);
            }
    
            const sanitize = (str: string) => (str || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9\s-]/g, "").replace(/\s+/g, '-');
            const baseName = `${sanitize(courseData.title)}-${sanitize(moduleData.title)}-${sanitize(title || 'Aula')}`;
            console.log('getSanitizedBaseFileName: baseFileName gerado:', baseName);
            return baseName;
        };

        const handleFileSelectFromLibrary = async (file: { key: string; url: string; }) => {
            console.log('handleFileSelectFromLibrary: Iniciado com arquivo:', file);
            setIsProcessing(true);
            setStatusText('Processando vídeo da biblioteca...');
            setError(null);
            try {
                const baseFileName = await getSanitizedBaseFileName();
                const originalExtension = file.key.split('.').pop() || 'mp4';
                const destinationKey = `${baseFileName}.${originalExtension}`;
                console.log('handleFileSelectFromLibrary: baseFileName:', baseFileName, 'originalExtension:', originalExtension, 'destinationKey:', destinationKey);

                setStatusText('Renomeando arquivo na nuvem...');
                console.log('handleFileSelectFromLibrary: Chamando rename-b2-file com sourceKey:', file.key, 'destinationKey:', destinationKey);
                const { data: renameData, error: renameError } = await supabase.functions.invoke('rename-b2-file', {
                    body: { sourceKey: file.key, destinationKey }
                });
                console.log('handleFileSelectFromLibrary: Resultado da renomeação:', renameData, 'Erro:', renameError);
                if (renameError) {
                    const errorBody = renameError.context || renameError;
                    const message = errorBody.error ? JSON.stringify(errorBody.error) : renameError.message;
                    throw new Error(message || 'Erro desconhecido ao renomear arquivo.');
                }
    
                const newVideoUrl = renameData.newUrl;
                setCurrentVideoUrl(newVideoUrl);
                setIsChangingVideo(false);
                setVideoFile(null); // Clear any selected file
                console.log('handleFileSelectFromLibrary: newVideoUrl set to:', newVideoUrl);
    
                setStatusText('Gerando miniatura do vídeo...');
                console.log('handleFileSelectFromLibrary: Chamando generateThumbnailFromUrl com:', newVideoUrl);
                const thumbBlob = await generateThumbnailFromUrl(newVideoUrl);
                const thumbFileName = `${baseFileName}-thumbnail.jpg`;
                console.log('handleFileSelectFromLibrary: thumbBlob gerado, thumbFileName:', thumbFileName);
                
                setStatusText('Enviando miniatura...');
                const newThumbnailUrl = await handleDirectUpload(thumbBlob, thumbFileName, (progress) => {
                    setStatusText(`Enviando miniatura: ${progress}%`);
                });
                setCurrentThumbnailUrl(newThumbnailUrl);
                setCustomThumbPreview(newThumbnailUrl);
                console.log('handleFileSelectFromLibrary: newThumbnailUrl set to:', newThumbnailUrl);

                setStatusText('Sucesso!');
    
            } catch (err: any) {
                console.error('handleFileSelectFromLibrary: Erro detalhado:', err);
                const errorMessage = err.message || JSON.stringify(err);
                setError(`Falha ao processar arquivo da biblioteca: ${errorMessage}`);
            } finally {
                setIsProcessing(false);
                console.log('handleFileSelectFromLibrary: Processo finalizado.');
            }
        };
    
        const handleSubmit = async (e: React.FormEvent) => {
            console.log('handleSubmit: Iniciado.');
            e.preventDefault();
            setIsProcessing(true);
            setError(null);
    
            let newVideoUrl = currentVideoUrl;
            let newThumbnailUrl = currentThumbnailUrl;
            let newDuration: number | null = null;
            
            try {
                setStatusText('Construindo nome do arquivo...');
                const baseFileName = await getSanitizedBaseFileName();
    
                if (videoFile) {
                    console.log('handleSubmit: videoFile detectado, iniciando upload...');
                    setStatusText('Analisando vídeo...');
                    const originalExtension = videoFile.name.split('.').pop() || 'mp4';
                    const newVideoFileName = `${baseFileName}.${originalExtension}`;
    
                    const videoElement = document.createElement('video');
                    videoElement.src = URL.createObjectURL(videoFile);
                    newDuration = await new Promise<number>((resolve) => {
                        videoElement.onloadedmetadata = () => { console.log('handleSubmit: video metadata loaded. Duration:', videoElement.duration); resolve(Math.round(videoElement.duration)); URL.revokeObjectURL(videoElement.src); };
                    });
    
                    setStatusText('Enviando vídeo (isso pode demorar)...');
                    const uploadedVideoUrl = await handleDirectUpload(videoFile, newVideoFileName, (progress) => {
                        setStatusText(`Enviando vídeo: ${progress}%`);
                        setUploadProgress(progress);
                    });
                    newVideoUrl = uploadedVideoUrl;
                    setCurrentVideoUrl(uploadedVideoUrl);
                    setVideoFile(null);
                    setIsChangingVideo(false);
                    console.log('handleSubmit: newVideoUrl from upload set to:', newVideoUrl);
                }
    
                let thumbnailBlobToUpload: Blob | null = null;
                if (thumbFile) {
                    console.log('handleSubmit: thumbFile detectado, enviando miniatura personalizada...');
                    setStatusText('Enviando miniatura personalizada...');
                    thumbnailBlobToUpload = thumbFile;
                } else if (videoFile) { 
                    console.log('handleSubmit: videoFile detectado, gerando miniatura automática...');
                    setStatusText('Gerando miniatura automática...');
                    thumbnailBlobToUpload = await generateThumbnail(videoFile);
                }
                
                if (thumbnailBlobToUpload) {
                    const newThumbFileName = `${baseFileName}-thumbnail.jpg`;
                    setStatusText('Enviando miniatura...');
                    console.log('handleSubmit: Chamando handleDirectUpload para thumbnail:', newThumbFileName);
                    newThumbnailUrl = await handleDirectUpload(thumbnailBlobToUpload, newThumbFileName, (progress) => {
                        setStatusText(`Enviando miniatura: ${progress}%`);
                    });
                    console.log('handleSubmit: newThumbnailUrl set to:', newThumbnailUrl);
                }
                
                let finalReleaseDays = 0;
                if (releaseType === 'days') {
                    finalReleaseDays = releaseDays;
                } else if (releaseType === 'date' && releaseDate) {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const rDate = new Date(releaseDate);
                    const diffTime = rDate.getTime() - today.getTime();
                    finalReleaseDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                }
    
                setStatusText('Salvando alterações no banco de dados...');
                const lessonData: { [key: string]: any } = {
                    title, description, release_days: finalReleaseDays, transcript,
                    video_url: newVideoUrl,
                    thumbnail_url: newThumbnailUrl,
                };
                if (newDuration !== null) lessonData.duration_seconds = newDuration;
                console.log('handleSubmit: Dados da aula para atualização:', lessonData);
    
                const { error: updateError } = await supabase.from('lessons').update(lessonData).eq('id', lessonId);
                if (updateError) {
                    console.error('handleSubmit: Erro ao atualizar a aula:', updateError);
                    throw updateError;
                }
                
                setStatusText('Sucesso!');
                console.log('handleSubmit: Aula atualizada com sucesso, chamando onLessonUpdated.');
                onLessonUpdated();
    
            } catch (err: any) {
                console.error("handleSubmit: Erro detalhado:", err);
                setError(`Falha no processo: ${err.message}`);
            } finally {
                setIsProcessing(false);
                setUploadProgress(0);
                console.log('handleSubmit: Processo handleSubmit finalizado.');
            }
        };

        const handleDeleteLesson = async () => {
            console.log('handleDeleteLesson: Iniciado para lessonId:', lessonId);
            setIsConfirmModalOpen(false);
            setIsProcessing(true);
            setStatusText('Deletando aula...');
            setError(null);

            try {
                console.log('handleDeleteLesson: Chamando delete-lesson para lessonId:', lessonId);
                const { error: deleteError } = await supabase.functions.invoke('delete-lesson', {
                    body: { lesson_id: lessonId }
                });

                if (deleteError) {
                    console.error('handleDeleteLesson: Erro ao deletar aula:', deleteError);
                    throw new Error(deleteError.message);
                }

                setStatusText('Aula deletada com sucesso!');
                console.log('handleDeleteLesson: Aula deletada com sucesso, chamando onLessonUpdated.');
                onLessonUpdated();
                
            } catch (err: any) {
                console.error('handleDeleteLesson: Erro detalhado:', err);
                setError(`Falha ao deletar: ${err.message}`);
                setIsProcessing(false);
            } 
            console.log('handleDeleteLesson: Processo finalizado.');
        };
        
        if (formLoading) return <div className="text-center p-8 text-white">Carregando...</div>;
        
        return (
            <form onSubmit={handleSubmit} className="text-white p-4 sm:p-6 lg:p-8">
                {error && <p className="text-sm text-red-500 text-center py-4">{"Erro: " + error}</p>}
                
                <ConfirmModal
                    isOpen={isConfirmModalOpen}
                    onClose={() => setIsConfirmModalOpen(false)}
                    onConfirm={handleDeleteLesson}
                    title="Confirmar Exclusão"
                    description="Você tem certeza que deseja deletar esta aula? Esta ação não pode ser desfeita."
                    confirmText="Sim, deletar aula"
                    isLoading={isProcessing}
                />
                <LibraryModal
                    isOpen={isLibraryModalOpen}
                    onClose={() => setIsLibraryModalOpen(false)}
                    onFileSelect={handleFileSelectFromLibrary}
                />
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">Editar conteúdo</h2>
                    <div className="flex space-x-4">
                        <button type="button" onClick={onCancel} className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-md transition-colors">Salvar como rascunho</button>
                        <button type="submit" disabled={isProcessing} className="bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 px-4 rounded-md disabled:opacity-50 transition-colors">
                            {isProcessing ? 'Salvando...' : 'Salvar Alterações'}
                        </button>
                    </div>
                </div>
    
                <div className="space-y-6">
                    <div className="space-y-6">
                        <div className="p-6 rounded-lg">
                            <h3 className="text-lg font-semibold mb-1">Detalhes do conteúdo</h3>
                            <p className="text-sm text-gray-400 mb-4">Aprenda mais sobre o <a href="#" className="text-blue-400 underline">upload de vídeos</a></p>
                            
                            <div className="space-y-4">
                                <div>
                                    <label htmlFor="edit-lessonTitle" className="block text-sm font-medium text-gray-300 mb-1">Título</label>
                                    <input id="edit-lessonTitle" type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-gray-700 border-gray-600 rounded-md py-2 px-3 focus:ring-gray-500 focus:border-gray-500" required />
                                </div>
                                <div>
                                    <label htmlFor="edit-lessonDesc" className="block text-sm font-medium text-gray-300 mb-1">Descrição</label>
                                    <textarea id="edit-lessonDesc" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full bg-gray-700 border-gray-600 rounded-md py-2 px-3 h-32 focus:ring-gray-500 focus:border-gray-500" rows={4}></textarea>
                                    <p className="text-right text-xs text-gray-500">{description.length}/165</p>
                                </div>
                            </div>
    
                            <div className="space-y-4 mt-6 relative">
                                <label className="block text-sm font-medium text-gray-300 mb-2">Vídeo</label>
    
                                {currentVideoUrl && !isChangingVideo ? (
                                    <div>
                                        <video key={currentVideoUrl} src={currentVideoUrl} controls controlsList="nodownload" onContextMenu={(e) => e.preventDefault()} className="w-full rounded-md aspect-video" />
                                        <button type="button" onClick={() => setIsChangingVideo(true)} className="text-sm text-blue-400 hover:underline mt-2">
                                            Trocar vídeo
                                        </button>
                                    </div>
                                ) : (
                                    <div>
                                        <KiwifyUploader 
                                            id="video-upload-edit"
                                            iconType="video"
                                            title="Arraste ou selecione o arquivo de vídeo"
                                            subtitle={videoFile ? `Novo: ${videoFile.name}` : `Nenhum vídeo selecionado`}
                                            file={videoFile}
                                            onFileSelect={handleVideoFileSelect}
                                            accept="video/*"
                                            previewUrl={null}
                                        />
                                        <div className="text-center my-4">
                                            <span className="text-gray-400">ou</span>
                                        </div>
                                        <button 
                                            type="button" 
                                            onClick={() => setIsLibraryModalOpen(true)}
                                            className="w-full bg-gray-600 hover:bg-gray-500 text-white font-semibold py-3 px-4 rounded-md transition-colors"
                                        >
                                            Selecionar da Biblioteca
                                        </button>
                                        {currentVideoUrl && (
                                            <button type="button" onClick={() => setIsChangingVideo(false)} className="text-sm text-gray-400 hover:underline mt-2">
                                                Cancelar
                                            </button>
                                        )}
                                    </div>
                                )}
    
                                {isProcessing && (
                                    <div className="absolute inset-0 bg-gray-800 bg-opacity-90 flex flex-col items-center justify-center rounded-md z-10">
                                        <p className="text-lg font-medium text-gray-200">{statusText}</p>
                                        {uploadProgress > 0 && uploadProgress <= 100 && (
                                            <div className="w-11/12 max-w-xs bg-gray-600 rounded-full h-2.5 mt-4">
                                                <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${uploadProgress}%` }}></div>
                                            </div>
                                        )}
                                    </div>
                                )}
                                 <p className="text-center text-sm text-gray-400 mt-4">Usar vídeo do <a href="#" className="text-blue-400 underline">YouTube</a></p>
                            </div>
                            
                            <div className="space-y-2 mt-6">
                                <label className="block text-sm font-medium text-gray-300">Thumbnail</label>
                                <KiwifyUploader
                                    id="thumb-upload-edit"
                                    iconType="photo"
                                    title="Selecione do computador ou arraste aqui"
                                    subtitle="PNG, JPG até 10 MB"
                                    file={thumbFile}
                                    onFileSelect={handleThumbFileSelect}
                                    accept="image/*"
                                    previewUrl={customThumbPreview || currentThumbnailUrl}
                                />
                                <div className="bg-yellow-900 bg-opacity-30 text-yellow-300 text-sm p-3 rounded-md flex items-start mt-2">
                                    <span className="mr-2">💡</span>
                                    <div>
                                        <p>Tamanho recomendado: 1280x720 pixels</p>
                                        <p className="text-xs text-yellow-400">Se você não fizer o upload de uma thumbnail, vamos extrair uma do vídeo automaticamente</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
    
                    <div className="space-y-6">
                        <div className="p-6 rounded-lg">
                            <h3 className="text-lg font-semibold mb-1">Anexos</h3>
                            <p className="text-sm text-gray-400 mb-4">Você pode anexar até 10 arquivos</p>
                            <KiwifyUploader
                                id="attachments-upload-edit"
                                iconType="attachment"
                                title="Drop here or selecione do computador"
                                subtitle="Você pode inserir arquivos dos tipos: png, jpg, gif, bmp, zip, rar, epub, xls, docx, ppt, pptx. Limite de máximo 10 arquivos com o máximo de 100 MB cada"
                                files={attachmentFiles}
                                onFilesSelect={handleAttachmentFilesChange}
                                accept="*"
                                multiple
                            />
                        </div>
                        <div className="p-6 rounded-lg">
                            <h3 className="text-lg font-semibold mb-1">Transcrição</h3>
                            <p className="text-sm text-gray-400 mb-4">Envie um arquivo .txt, .srt ou .vtt para ser usado pela IA.</p>
                            <input id="edit-transcriptFile" type="file" onChange={handleTranscriptFileChange} className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-gray-700 file:text-white hover:file:bg-gray-600" accept=".txt,.srt,.vtt"/>
                            <textarea value={transcript} onChange={(e) => setTranscript(e.target.value)} className="w-full bg-gray-700 border-gray-600 rounded-md py-2 px-3 mt-2" rows={6} placeholder="Ou cole o conteúdo do arquivo aqui..."></textarea>
                        </div>
                        
                        <div className="p-6 rounded-lg">
                            <h3 className="text-lg font-semibold mb-1">Liberação</h3>
                            <p className="text-sm text-gray-400 mb-4">Aprenda mais sobre as configurações de <a href="#" className="text-blue-400 underline">liberação do conteúdo</a></p>
                            
                            <label className="block text-sm font-medium text-gray-300 mb-2">Quando liberar o conteúdo</label>
                            <div className="space-y-3">
                                <div className="flex items-center">
                                    <input id="release-immediate-edit" name="release-type-edit" type="radio" value="immediate" checked={releaseType === 'immediate'} onChange={(e) => setReleaseType(e.target.value)} className="h-4 w-4 text-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-500"/>
                                    <label htmlFor="release-immediate-edit" className="ml-3 block text-sm font-medium text-gray-300">Liberação imediata</label>
                                </div>
                                <div className="flex items-center">
                                    <input id="release-days-edit" name="release-type-edit" type="radio" value="days" checked={releaseType === 'days'} onChange={(e) => setReleaseType(e.target.value)} className="h-4 w-4 text-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-500"/>
                                    <label htmlFor="release-days-edit" className="ml-3 block text-sm font-medium text-gray-300">Por dias</label>
                                </div>
                                {releaseType === 'days' && (
                                    <div className="pl-7">
                                        <input type="number" value={releaseDays} onChange={(e) => setReleaseDays(Number(e.target.value))} className="w-full bg-gray-700 border-gray-600 rounded-md py-2 px-3 text-sm" placeholder="Liberar em X dias após a compra"/>
                                    </div>
                                )}
                                <div className="flex items-center">
                                    <input id="release-date-edit" name="release-type-edit" type="radio" value="date" checked={releaseType === 'date'} onChange={(e) => setReleaseType(e.target.value)} className="h-4 w-4 text-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-500"/>
                                    <label htmlFor="release-date-edit" className="ml-3 block text-sm font-medium text-gray-300">Por data</label>
                                </div>
                                 {releaseType === 'date' && (
                                    <div className="pl-7">
                                        <input type="date" value={releaseDate} onChange={(e) => setReleaseDate(e.target.value)} className="w-full bg-gray-700 border-gray-600 rounded-md py-2 px-3 text-sm"/>
                                    </div>
                                )}
                            </div>
    
                            <div className="mt-6">
                                <label className="block text-sm font-medium text-gray-300 mb-2">Duração do conteúdo</label>
                                <div className="flex items-center">
                                    <input id="limit-duration-edit" type="checkbox" checked={isDurationLimited} onChange={(e) => setIsDurationLimited(e.target.checked)} className="h-4 w-4 text-blue-600 bg-gray-700 border-gray-500 rounded focus:ring-blue-500"/>
                                    <label htmlFor="limit-duration-edit" className="ml-3 block text-sm font-medium text-gray-300">Limitar duração do conteúdo</label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
    
                {error && <p className="text-sm text-red-500 text-center py-4">{error}</p>}
                
                <div className="flex justify-between items-center pt-6 mt-8 border-t border-gray-700">
                    <div>
                        <button
                            type="button"
                            onClick={() => setIsConfirmModalOpen(true)}
                            disabled={isProcessing}
                            className="text-red-500 hover:text-red-400 font-semibold py-2 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Deletar Aula
                        </button>
                    </div>
                    <div className="flex space-x-4">
                        <button type="button" onClick={onCancel} className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-md transition-colors">Salvar como rascunho</button>
                        <button type="submit" disabled={isProcessing} className="bg-gray-800 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-md disabled:opacity-50 transition-colors">
                            {isProcessing ? 'Salvando...' : 'Salvar Alterações'}
                        </button>
                    </div>
                </div>
            </form>
        );
};

export default EditLessonForm;