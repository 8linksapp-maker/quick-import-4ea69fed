import React from 'react';
import { ArrowUpTrayIcon, VideoCameraIcon, PhotoIcon } from './Icons';

interface KiwifyUploaderProps {
    onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
    accept: string;
    title: string;
    subtitle: string;
    iconType: 'video' | 'photo'; // 'video' for VideoCameraIcon, 'photo' for PhotoIcon
    file: File | null;
    previewUrl?: string | null;
    id: string; // Unique ID for htmlFor and input
}

const KiwifyUploader: React.FC<KiwifyUploaderProps> = ({
    onFileSelect,
    accept,
    title,
    subtitle,
    iconType,
    file,
    previewUrl,
    id,
}) => {
    const IconComponent = iconType === 'video' ? VideoCameraIcon : PhotoIcon;

    return (
        <label htmlFor={id} className="relative block w-full p-8 text-center bg-gray-800 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:border-blue-500 transition-colors min-h-[150px] flex flex-col items-center justify-center">
            {previewUrl ? (
                <img src={previewUrl} alt="Preview" className="max-h-32 object-contain rounded-md" />
            ) : (
                <div className="text-gray-500">{IconComponent && <IconComponent className="w-10 h-10" />}</div>
            )}
            <p className="mt-4 text-lg font-semibold text-gray-300">
                {file ? `Arquivo selecionado: ${file.name}` : title}
            </p>
            <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
            <input id={id} name={id} type="file" className="sr-only" accept={accept} onChange={onFileSelect} />
        </label>
    );
};

export default KiwifyUploader;