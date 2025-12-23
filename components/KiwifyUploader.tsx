import React from 'react';
import { ArrowUpTrayIcon, VideoCameraIcon, PhotoIcon, PaperClipIcon } from './Icons';

interface KiwifyUploaderProps {
    accept: string;
    title: string;
    subtitle?: string; // Made optional
    id: string; // Unique ID for htmlFor and input
    multiple?: boolean; // New prop for multiple file selection
    
    // Props for single file upload
    onFileSelect?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    file?: File | null;
    previewUrl?: string | null;
    iconType: 'video' | 'photo' | 'attachment'; // 'video', 'photo', or 'attachment' for PaperClipIcon

    // Props for multiple files upload
    onFilesSelect?: (files: File[]) => void;
    files?: File[]; // List of files for multiple selection
}

const KiwifyUploader: React.FC<KiwifyUploaderProps> = ({
    accept,
    title,
    subtitle,
    id,
    multiple = false,
    onFileSelect,
    file,
    previewUrl,
    iconType,
    onFilesSelect,
    files,
}) => {
    let IconComponent;
    switch (iconType) {
        case 'video':
            IconComponent = VideoCameraIcon;
            break;
        case 'photo':
            IconComponent = PhotoIcon;
            break;
        case 'attachment':
            IconComponent = PaperClipIcon;
            break;
        default:
            IconComponent = ArrowUpTrayIcon; // Fallback
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (multiple && onFilesSelect) {
            if (e.target.files) {
                onFilesSelect(Array.from(e.target.files));
            }
        } else if (!multiple && onFileSelect) {
            onFileSelect(e);
        }
    };

    const displayFileName = () => {
        if (multiple && files && files.length > 0) {
            return `${files.length} arquivo(s) selecionado(s)`;
        }
        if (!multiple && file) {
            return file.name;
        }
        return title;
    };


    return (
        <label htmlFor={id} className="relative block w-full p-8 text-center bg-gray-800 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:border-blue-500 transition-colors min-h-[150px] flex flex-col items-center justify-center">
            {(previewUrl && !multiple) ? ( // Only show preview for single file upload
                <img src={previewUrl} alt="Preview" className="max-h-32 object-contain rounded-md" />
            ) : (
                <div className="text-gray-500">{IconComponent && <IconComponent className="w-10 h-10" />}</div>
            )}
            <p className="mt-4 text-lg font-semibold text-gray-300">
                {displayFileName()}
            </p>
            {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
            <input id={id} name={id} type="file" className="sr-only" accept={accept} onChange={handleChange} multiple={multiple} />
        </label>
    );
};

export default KiwifyUploader;