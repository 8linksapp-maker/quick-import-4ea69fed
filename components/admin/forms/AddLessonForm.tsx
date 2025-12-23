import React, { useState } from 'react';
import { supabase } from '../../../src/supabaseClient';
import KiwifyUploader from '../../KiwifyUploader';
import LibraryModal, { B2File } from '../LibraryModal';

interface AddLessonFormProps {
    moduleId: number;
    onLessonAdded: () => void;
    onCancel: () => void;
}

const generateThumbnail = (videoSource: File | string, seekTime: number = 2): Promise<Blob> => {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        let objectUrl: string | null = null;

        if (videoSource instanceof File) {
            objectUrl = URL.createObjectURL(videoSource);
            video.src = objectUrl;
        } else {
            video.crossOrigin = "anonymous"; // Important for CORS
            video.src = videoSource;
        }

        video.currentTime = seekTime;

        const onSeeked = () => {
            // Remove listeners to prevent memory leaks
            video.removeEventListener('seeked', onSeeked);
            video.removeEventListener('error', onError);

            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            
            if (ctx) {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                canvas.toBlob(blob => {
                    if (objectUrl) {
                        URL.revokeObjectURL(objectUrl);
                    }
                    if (blob) resolve(blob);
                    else reject(new Error('Canvas to Blob conversion failed'));
                }, 'image/jpeg', 0.8);
            } else {
                if (objectUrl) {
                    URL.revokeObjectURL(objectUrl);
                }
                reject(new Error('Could not get canvas context'));
            }
        };

        const onError = (e: Event | string) => {
            // Remove listeners to prevent memory leaks
            video.removeEventListener('seeked', onSeeked);
            video.removeEventListener('error', onError);
            
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
            }

            if (video.error) {
                reject(new Error(`Video error: ${video.error.message} (code: ${video.error.code})`));
            } else if (typeof e === 'string') {
                reject(new Error(e));
            } else {
                reject(new Error('An unknown video error occurred.'));
            }
        };

        video.addEventListener('seeked', onSeeked);
        video.addEventListener('error', onError);
        
        // Start loading the video
        video.load();
    });
};

const AddLessonForm: React.FC<AddLessonFormProps> = ({ moduleId, onLessonAdded, onCancel }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [releaseDays, setReleaseDays] = useState(0);
    const [releaseDate, setReleaseDate] = useState('');
    const [releaseType, setReleaseType] = useState('immediate');
    const [isDurationLimited, setIsDurationLimited] = useState(false);
    const [isLibraryModalOpen, setIsLibraryModalOpen] = useState(false);

    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string | null>(null);
    const [thumbFile, setThumbFile] = useState<File | null>(null);
    const [customThumbPreview, setCustomThumbPreview] = useState<string | null>(null);
    const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
    const [transcript, setTranscript] = useState('');

    const [isProcessing, setIsProcessing] = useState(false);
    const [statusText, setStatusText] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [uploadProgress, setUploadProgress] = useState(0);

    const handleVideoFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setVideoFile(file);
            setUploadedVideoUrl(null); 
        }
    };

    const handleThumbFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setThumbFile(file);
            const reader = new FileReader();
            reader.onloadend = () => setCustomThumbPreview(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleFileSelectFromLibrary = async (file: B2File) => {
        console.log("AddLessonForm: handleFileSelectFromLibrary CALLED. File:", file);
        console.log("AddLessonForm: Initial state: title=", title);

        setIsProcessing(true);
        setStatusText('Processando vídeo da biblioteca...');
        setError(null);
        setIsLibraryModalOpen(false);

        try {
            console.log("AddLessonForm: Entering TRY block.");
            if (!title) {
                console.log("AddLessonForm: Title is EMPTY. Setting error.");
                setError("Por favor, preencha o título da aula antes de selecionar um vídeo da biblioteca.");
                // No need for timeout here, user action is required.
                setIsProcessing(false);
                return;
            }
    
            console.log("AddLessonForm: Title is PRESENT. Proceeding with rename.");
            const baseFileName = await getSanitizedBaseFileName();
            const originalExtension = file.key.split('.').pop() || 'mp4';
            const destinationKey = `${baseFileName}.${originalExtension}`;
    
            setStatusText('Renomeando arquivo na nuvem...');
            console.log("AddLessonForm: Calling rename-b2-file with:", { sourceKey: file.key, destinationKey });
            const { data: renameData, error: renameError } = await supabase.functions.invoke('rename-b2-file', {
                body: { sourceKey: file.key, destinationKey }
            });
    
            if (renameError) {
                console.error("AddLessonForm: rename-b2-file ERROR:", renameError);
                throw new Error(renameError.message || 'Erro desconhecido ao renomear arquivo.');
            }
            
            console.log("AddLessonForm: rename-b2-file SUCCESS:", renameData);
            const newVideoUrl = renameData?.newUrl || file.url;
            setUploadedVideoUrl(newVideoUrl);
            setVideoFile(null); // Clear any selected file
    
            setStatusText('Vídeo da biblioteca processado com sucesso.');
    
        } catch (err: any) {
            console.error("AddLessonForm: CATCH block error:", err);
            const errorMessage = err.message || JSON.stringify(err);
            setError(`Falha ao processar arquivo da biblioteca: ${errorMessage}`);
            setUploadedVideoUrl(null);
            setIsProcessing(false); // Stop processing on error
        } finally {
            console.log("AddLessonForm: Entering FINALLY block.");
            // Short delay to allow user to see success/error message
            setTimeout(() => {
                setIsProcessing(false);
                setStatusText('');
            }, 2000);
        }
    };

    const handleAttachmentFilesChange = (newFiles: File[]) => {
        setAttachmentFiles(prev => [...prev, ...newFiles].slice(0, 10));
    };

    const handleTranscriptFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
        const fileType = fileToUpload.type;

        const { data: { session } } = await supabase.auth.getSession();
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

        const response = await fetch(`${supabaseUrl}/functions/v1/generate-upload-url`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session?.access_token}`,
            },
            body: JSON.stringify({
                fileName: fileName,
                fileType: fileType,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Erro ao gerar URL de upload: ${errorData.error || response.statusText}`);
        }

        const data = await response.json();

        const { uploadUrl, publicUrl } = data;

        if (!uploadUrl || !publicUrl) {
            throw new Error('URL de upload ou URL pública não recebida da função.');
        }

        console.log('DEBUG: Attempting direct upload with data:', { uploadUrl, publicUrl, fileType });

        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('PUT', uploadUrl);
            xhr.setRequestHeader('Content-Type', fileType);

            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable) {
                    const progress = Math.round((event.loaded / event.total) * 100);
                    onProgress(progress);
                }
            };

            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve(publicUrl);
                } else {
                    reject(new Error(`Falha no upload direto para B2: ${xhr.status} - ${xhr.statusText}`));
                }
            };

            xhr.onerror = () => {
                console.error("XHR Error:", xhr.status, xhr.statusText, xhr.response);
                reject(new Error('Erro de rede durante o upload direto para B2. Verifique o console para detalhes e confirme a configuração de CORS no bucket do B2.'));
            };

            xhr.send(fileToUpload);
        });
    };

    const getSanitizedBaseFileName = async () => {
        const { data: moduleData, error: moduleError } = await supabase
            .from('modules')
            .select('title, course_id')
            .eq('id', moduleId)
            .single();
    
        if (moduleError) throw new Error(`Falha ao buscar módulo: ${moduleError.message}`);
        if (!moduleData) throw new Error('Módulo não encontrado.');
    
        const { data: courseData, error: courseError } = await supabase
            .from('courses')
            .select('title')
            .eq('id', moduleData.course_id)
            .single();
    
        if (courseError) throw new Error(`Falha ao buscar curso: ${courseError.message}`);
        if (!courseData) throw new Error('Curso não encontrado.');
    
        const sanitize = (str: string) => (str || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9\s-]/g, "").replace(/\s+/g, '-');
        
        const baseFileName = `${sanitize(courseData.title)}-${sanitize(moduleData.title)}-${sanitize(title || 'Aula')}`;
        return baseFileName;
    };


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!videoFile && !uploadedVideoUrl) {
            setError("Por favor, selecione um arquivo de vídeo.");
            return;
        }

        setIsProcessing(true);
        setError(null);
        setUploadProgress(0);

        try {
            let videoUrlToSave = uploadedVideoUrl;

            // Only upload if there's a new file that hasn't been uploaded yet.
            if (videoFile && !videoUrlToSave) {
                setStatusText('Construindo nome do arquivo...');
                
                const baseFileName = await getSanitizedBaseFileName();
                const originalExtension = videoFile.name.split('.').pop() || 'mp4';
                const newVideoFileName = `${baseFileName}.${originalExtension}`;
                
                setStatusText('Enviando vídeo...');
                const newVideoUrl = await handleDirectUpload(videoFile, newVideoFileName, (progress) => {
                    setStatusText(`Enviando vídeo: ${progress}%`);
                    setUploadProgress(progress);
                });
                setUploadedVideoUrl(newVideoUrl);
                videoUrlToSave = newVideoUrl;
            }

            if (!videoUrlToSave) {
                throw new Error("Ocorreu um erro e a URL do vídeo não foi gerada. Tente novamente.");
            }

            setStatusText('Analisando vídeo...');
            const videoElement = document.createElement('video');
            videoElement.src = videoUrlToSave;
            const duration = await new Promise<number>((resolve, reject) => {
                videoElement.onloadedmetadata = () => { resolve(Math.round(videoElement.duration)); };
                videoElement.onerror = () => reject(new Error("Não foi possível carregar metadados do vídeo."));
            });

            let newThumbnailUrl = '';
            let thumbnailBlobToUpload: Blob | null = null;
            
            if (thumbFile) {
                setStatusText('Enviando miniatura personalizada...');
                thumbnailBlobToUpload = thumbFile;
            } else if (videoFile || videoUrlToSave) {
                setStatusText('Gerando miniatura automática...');
                const source = videoFile || videoUrlToSave;
                if(source) {
                    try {
                        thumbnailBlobToUpload = await generateThumbnail(source);
                    } catch (thumbError) {
                        console.error("Erro ao gerar thumbnail:", thumbError);
                        setError("Não foi possível gerar a thumbnail do vídeo. O vídeo pode estar em um formato não suportado pelo navegador ou haver um problema de CORS. Tente enviar uma thumbnail manualmente.");
                        // Continue without a thumbnail or stop? For now, we'll let it continue and it will just not have a thumbnail
                    }
                }
            }
            
            if (thumbnailBlobToUpload) {
                const baseFileName = await getSanitizedBaseFileName();
                const newThumbFileName = `${baseFileName}-thumbnail.jpg`;

                setStatusText('Enviando miniatura...');
                newThumbnailUrl = await handleDirectUpload(thumbnailBlobToUpload, newThumbFileName, (progress) => {
                    setStatusText(`Enviando miniatura: ${progress}%`);
                });
            }
            
            setStatusText('Salvando aula no banco de dados...');
            const { data: lessons, error: orderError } = await supabase.from('lessons').select('order').eq('module_id', moduleId).order('order', { ascending: false }).limit(1);
            if (orderError) throw orderError;
            const newOrder = (lessons && lessons.length > 0) ? lessons[0].order + 1 : 1;

            let finalReleaseDays = 0;
            if (releaseType === 'days') {
                finalReleaseDays = releaseDays;
            } else if (releaseType === 'date') {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const rDate = new Date(releaseDate);
                const diffTime = rDate.getTime() - today.getTime();
                finalReleaseDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            }

            const { data: newLesson, error: insertError } = await supabase.from('lessons').insert([{
                module_id: moduleId, title, description, transcript,
                video_url: videoUrlToSave,
                thumbnail_url: newThumbnailUrl,
                duration_seconds: duration,
                release_days: finalReleaseDays,
                order: newOrder,
            }]).select().single();

            if (insertError) throw insertError;

            console.log('DEBUG: attachmentFiles antes do upload:', attachmentFiles);

            if (attachmentFiles.length > 0) {
                setStatusText(`Enviando ${attachmentFiles.length} anexos...`);

                const filePromises = attachmentFiles.map(file => {
                    return new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => {
                            // result includes the MIME type prefix, which we need to remove
                            const base64 = (reader.result as string).split(',')[1];
                            resolve({
                                fileName: file.name,
                                fileBody: base64,
                                fileType: file.type,
                            });
                        };
                        reader.onerror = reject;
                        reader.readAsDataURL(file);
                    });
                });
                
                const attachmentPayload = await Promise.all(filePromises);

                const { error: attachmentError } = await supabase.functions.invoke('upload-lesson-attachment', {
                    body: {
                        lesson_id: newLesson.id,
                        attachmentFiles: attachmentPayload,
                    },
                });

                if (attachmentError) {
                    // Even if attachments fail, the lesson was created. We should notify the user.
                    // The error can be displayed, but we don't throw, as the primary action (lesson creation) was successful.
                    console.error('Attachment upload failed:', attachmentError);
                    setError(`A aula foi criada, mas falhou o envio dos anexos: ${attachmentError.message}. Você pode tentar adicioná-los editando a aula.`);
                }
            }

            setStatusText('Sucesso!');
            onLessonAdded();

        } catch (err: any) {
            console.error("Detailed error in handleSubmit:", err);
            setError(`Falha no processo: ${err.message}`);
        } finally {
            setIsProcessing(false);
            setUploadProgress(0); 
        }
    };

    return (
        <form onSubmit={handleSubmit} className="text-white p-4 sm:p-6 lg:p-8">
            <LibraryModal
                isOpen={isLibraryModalOpen}
                onClose={() => setIsLibraryModalOpen(false)}
                onFileSelect={handleFileSelectFromLibrary}
            />
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Criar conteúdo</h2>
                <div className="flex space-x-4">
                    <button type="button" onClick={onCancel} className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-md transition-colors">Salvar como rascunho</button>
                    <button type="submit" disabled={isProcessing} className="bg-gray-800 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-md disabled:opacity-50 transition-colors">
                        {isProcessing ? 'Criando...' : 'Criar e publicar'}
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
                                <label htmlFor="add-lessonTitle" className="block text-sm font-medium text-gray-300 mb-1">Título</label>
                                <input id="add-lessonTitle" type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-gray-700 border-gray-600 rounded-md py-2 px-3 focus:ring-gray-500 focus:border-gray-500" required />
                            </div>
                            <div>
                                <label htmlFor="add-lessonDesc" className="block text-sm font-medium text-gray-300 mb-1">Descrição</label>
                                <textarea id="add-lessonDesc" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full bg-gray-700 border-gray-600 rounded-md py-2 px-3 h-32 focus:ring-gray-500 focus:border-gray-500" rows={4}></textarea>
                                <p className="text-right text-xs text-gray-500">{description.length}/165</p>
                            </div>
                        </div>

                        <div className="space-y-4 mt-6 relative">
                            <label className="block text-sm font-medium text-gray-300 mb-2">Vídeo</label>

                            {uploadedVideoUrl ? (
                                <div>
                                    <video key={uploadedVideoUrl} src={uploadedVideoUrl} controls controlsList="nodownload" oncontextmenu={(e) => e.preventDefault()} className="w-full rounded-md aspect-video" />
                                    <button 
                                        type="button" 
                                        onClick={() => { setUploadedVideoUrl(null); setVideoFile(null); }} 
                                        className="text-sm text-blue-400 hover:underline mt-2"
                                    >
                                        Trocar vídeo
                                    </button>
                                </div>
                            ) : (
                                <KiwifyUploader
                                    id="video-upload-add"
                                    iconType="video"
                                    title="Drop files here, browse files or import from:"
                                    file={videoFile}
                                    onFileSelect={handleVideoFileSelect}
                                    accept="video/*"
                                    previewUrl={null}
                                />
                            )}
                            
                            {isProcessing && !uploadedVideoUrl && (
                                <div className="absolute inset-0 bg-gray-800 bg-opacity-90 flex flex-col items-center justify-center rounded-md z-10">
                                    <p className="text-lg font-medium text-gray-200">{statusText}</p>
                                    {uploadProgress > 0 && uploadProgress <= 100 && (
                                        <div className="w-11/12 max-w-xs bg-gray-600 rounded-full h-2.5 mt-4">
                                            <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${uploadProgress}%` }}></div>
                                        </div>
                                    )}
                                </div>
                            )}
                             <p className="text-center text-sm text-gray-400 mt-4">
                                Usar vídeo do <a href="#" className="text-blue-400 underline">YouTube</a> 
                                <span className="mx-2">ou</span>
                                <button type="button" onClick={() => setIsLibraryModalOpen(true)} className="text-blue-400 underline">
                                    selecionar da biblioteca
                                </button>
                            </p>
                        </div>

                        <div className="space-y-2 mt-6">
                            <label className="block text-sm font-medium text-gray-300">Thumbnail</label>
                            <KiwifyUploader
                                id="thumb-upload-add"
                                iconType="photo"
                                title="Selecione do computador ou arraste aqui"
                                subtitle="PNG, JPG até 10 MB"
                                file={thumbFile}
                                onFileSelect={handleThumbFileSelect}
                                accept="image/*"
                                previewUrl={customThumbPreview}
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
                            id="attachments-upload"
                            iconType="attachment"
                            title="Drop here or selecione do computador"
                            subtitle="Você pode inserir arquivos dos tipos: png, jpg, gif, bmp, zip, rar, epub, xls, docx, ppt, pptx. Limite de máximo 10 arquivos com o máximo de 100 MB cada"
                            files={attachmentFiles}
                            onFilesSelect={handleAttachmentFilesChange} // Usar a nova prop
                            accept="*"
                            multiple
                        />
                    </div>
                    <div className="p-6 rounded-lg">
                        <h3 className="text-lg font-semibold mb-1">Transcrição</h3>
                        <p className="text-sm text-gray-400 mb-4">Envie um arquivo .txt, .srt ou .vtt para ser usado pela IA.</p>
                        <input id="add-transcriptFile" type="file" onChange={handleTranscriptFileChange} className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-gray-700 file:text-white hover:file:bg-gray-600" accept=".txt,.srt,.vtt"/>
                        <textarea value={transcript} onChange={(e) => setTranscript(e.target.value)} className="w-full bg-gray-700 border-gray-600 rounded-md py-2 px-3 mt-2" rows={6} placeholder="Ou cole o conteúdo do arquivo aqui..."></textarea>
                    </div>

                    <div className="p-6 rounded-lg">
                        <h3 className="text-lg font-semibold mb-1">Liberação</h3>
                        <p className="text-sm text-gray-400 mb-4">Aprenda mais sobre as configurações de <a href="#" className="text-blue-400 underline">liberação do conteúdo</a></p>

                        <label className="block text-sm font-medium text-gray-300 mb-2">Quando liberar o conteúdo</label>
                        <div className="space-y-3">
                            <div className="flex items-center">
                                <input id="release-immediate" name="release-type" type="radio" value="immediate" checked={releaseType === 'immediate'} onChange={(e) => setReleaseType(e.target.value)} className="h-4 w-4 text-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-500"/>
                                <label htmlFor="release-immediate" className="ml-3 block text-sm font-medium text-gray-300">Liberação imediata</label>
                            </div>
                            <div className="flex items-center">
                                <input id="release-days" name="release-type" type="radio" value="days" checked={releaseType === 'days'} onChange={(e) => setReleaseType(e.target.value)} className="h-4 w-4 text-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-500"/>
                                <label htmlFor="release-days" className="ml-3 block text-sm font-medium text-gray-300">Por dias</label>
                            </div>
                            {releaseType === 'days' && (
                                <div className="pl-7">
                                    <input type="number" value={releaseDays} onChange={(e) => setReleaseDays(Number(e.target.value))} className="w-full bg-gray-700 border-gray-600 rounded-md py-2 px-3 text-sm" placeholder="Liberar em X dias após a compra"/>
                                </div>
                            )}
                            <div className="flex items-center">
                                <input id="release-date" name="release-type" type="radio" value="date" checked={releaseType === 'date'} onChange={(e) => setReleaseType(e.target.value)} className="h-4 w-4 text-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-500"/>
                                <label htmlFor="release-date" className="ml-3 block text-sm font-medium text-gray-300">Por data</label>
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
                                <input id="limit-duration" type="checkbox" checked={isDurationLimited} onChange={(e) => setIsDurationLimited(e.target.checked)} className="h-4 w-4 text-blue-600 bg-gray-700 border-gray-500 rounded focus:ring-blue-500"/>
                                <label htmlFor="limit-duration" className="ml-3 block text-sm font-medium text-gray-300">Limitar duração do conteúdo</label>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {error && <p className="text-sm text-red-500 text-center py-4">{error}</p>}

            <div className="flex justify-end space-x-4 pt-6 mt-8 border-t border-gray-700">
                 <button type="button" onClick={onCancel} className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-md transition-colors">Salvar como rascunho</button>
                <button type="submit" disabled={isProcessing} className="bg-gray-800 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-md disabled:opacity-50 transition-colors">
                    {isProcessing ? 'Criando...' : 'Criar e publicar'}
                </button>
            </div>
        </form>
    );
};

export default AddLessonForm;