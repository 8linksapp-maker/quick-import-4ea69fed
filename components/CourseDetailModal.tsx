import React, { useEffect, useState, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { Course, Lesson } from './LoginCard';
import { PlayIcon, AddIcon, LikeIcon, XMarkIcon, LockClosedIcon } from './Icons';
import CourseCurriculum from './CourseCurriculum';
import { getEmbedUrl } from '../src/videoUtils';

interface CourseDetailModalProps {
    course: Course;
    onClose: () => void;
    onLessonClick: (lesson: Lesson) => void;
    isLoading: boolean;
    initialModuleId?: string | null;
    activeLessonId?: string | null;
}

const CourseDetailModal: React.FC<CourseDetailModalProps> = ({ course, onClose, onLessonClick, isLoading, initialModuleId, activeLessonId }) => {
    const modalRoot = document.getElementById('modal-root');
    const [isClosing, setIsClosing] = useState(false);
    const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
    const [heroContentUrl, setHeroContentUrl] = useState<string | null>(null);

    const selectedModule = useMemo(() => {
        if (!course.modules) return null;
        return course.modules.find(m => m.id === selectedModuleId);
    }, [course.modules, selectedModuleId]);

    useEffect(() => {
        if (isLoading || !course.modules || course.modules.length === 0) return;

        const moduleExists = initialModuleId && course.modules.some(m => m.id === initialModuleId);
        const initialId = moduleExists ? initialModuleId : course.modules[0]?.id || null;
        setSelectedModuleId(initialId);
    }, [isLoading, course.modules, initialModuleId]);

    useEffect(() => {
        if (selectedModule && selectedModule.lessons.length > 0 && selectedModule.lessons[0].videoUrl) {
            setHeroContentUrl(selectedModule.lessons[0].videoUrl);
        } else {
            setHeroContentUrl(course.heroUrl);
        }
    }, [selectedModule, course.heroUrl]);

    const handlePlayClick = () => {
        if (selectedModule && !selectedModule.isLocked && selectedModule.lessons.length > 0) {
            onLessonClick(selectedModule.lessons[0]);
        }
    };

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => onClose(), 300);
    };

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = 'unset'; };
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') handleClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    if (!modalRoot) return null;

    const animationClasses = isClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100';
    const heroVideo = getEmbedUrl(heroContentUrl, false);

    return ReactDOM.createPortal(
        <div 
            className={`fixed inset-0 z-50 flex items-center justify-center bg-black/80 transition-opacity duration-300 ${isClosing ? 'opacity-0' : 'opacity-100'}`}
            onClick={handleClose}
        >
            <div
                className={`bg-[#181818] text-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto scrollbar-hide transform transition-all duration-300 ${animationClasses}`}
                onClick={e => e.stopPropagation()}
            >
                {/* Hero Section */}
                <div className="relative aspect-video bg-black rounded-t-lg">
                    {heroVideo.url && (!selectedModule || !selectedModule.isLocked) ? (
                        heroVideo.type === 'iframe' ? (
                            <iframe
                                src={heroVideo.url}
                                className="w-full h-full object-cover rounded-t-lg"
                                frameBorder="0"
                                allow="autoplay; fullscreen; picture-in-picture"
                                allowFullScreen
                            ></iframe>
                        ) : (
                            <video
                                key={heroVideo.url}
                                src={heroVideo.url}
                                autoPlay
                                muted
                                loop
                                playsInline
                                className="w-full h-full object-cover rounded-t-lg"
                            />
                        )
                    ) : (
                        <img src={course.heroUrl} alt={course.title} className="w-full h-full object-cover rounded-t-lg" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#181818] via-transparent"></div>
                    <button onClick={handleClose} className="absolute top-4 right-4 text-white bg-[#181818] rounded-full p-1 hover:bg-zinc-700 transition">
                        <XMarkIcon />
                    </button>
                    <div className="absolute bottom-10 left-10">
                        <h1 className="text-4xl font-bold mb-4">{selectedModule?.title || course.title}</h1>
                        <div className="flex items-center space-x-3">
                            {selectedModule?.isLocked ? (
                                <button disabled className="flex items-center justify-center bg-zinc-600 text-white/70 font-bold px-6 py-2 rounded text-lg cursor-not-allowed">
                                    <LockClosedIcon className="w-6 h-6" />
                                    <span className="ml-2">{selectedModule.availableOn}</span>
                                </button>
                            ) : (
                                <button onClick={handlePlayClick} className="flex items-center justify-center bg-white text-black font-bold px-6 py-2 rounded hover:bg-gray-200 transition text-lg">
                                    <PlayIcon className="w-7 h-7" />
                                    <span className="ml-2">Assistir</span>
                                </button>
                            )}
                            <button className="w-11 h-11 flex items-center justify-center rounded-full border-2 border-gray-400 text-white hover:border-white transition-colors">
                                <AddIcon />
                            </button>
                             <button className="w-11 h-11 flex items-center justify-center rounded-full border-2 border-gray-400 text-white hover:border-white transition-colors">
                                <LikeIcon />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Details Section */}
                <div className="p-10">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="md:col-span-2">
                             <div className="flex items-center space-x-4 mb-4 text-base">
                                <span className="text-green-400 font-semibold">{course.relevance}</span>
                                <span>{course.year}</span>
                                <span className="border border-gray-400 px-1.5 text-xs">{course.ageRating}+</span>
                                <span>{course.duration}</span>
                                <span className="border border-gray-400 px-2 text-xs">HD</span>
                            </div>
                            <p className="leading-relaxed">{course.description}</p>
                        </div>
                        <div className="text-sm">
                            <p className="mb-2"><span className="text-gray-400">Elenco: </span>{course.cast.join(', ')}</p>
                            <p className="mb-2"><span className="text-gray-400">Gêneros: </span>{course.genres.join(', ')}</p>
                            <p><span className="text-gray-400">Este curso é: </span>{course.tagsDetail.join(', ')}</p>
                        </div>
                    </div>
                    
                    {/* Modules/Episodes */}
                    {isLoading ? (
                        <div className="p-10 text-center">
                            <p className="text-white">Carregando aulas...</p>
                        </div>
                    ) : (
                        course.modules && course.modules.length > 0 && (
                            <CourseCurriculum 
                                modules={course.modules} 
                                onLessonClick={onLessonClick} 
                                activeLessonId={activeLessonId}
                                selectedModuleId={selectedModuleId}
                                onModuleChange={setSelectedModuleId}
                            />
                        )
                    )}
                </div>
            </div>
        </div>,
        modalRoot
    );
};

export default CourseDetailModal;
