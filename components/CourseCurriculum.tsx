import React, { useMemo } from 'react';
import { Module, Lesson } from './LoginCard';
import { ChevronDownIcon } from './Icons';

interface CourseCurriculumProps {
    modules: Module[];
    onLessonClick: (lesson: Lesson) => void;
    activeLessonId?: string | null;
    selectedModuleId: string | null;
    onModuleChange: (moduleId: string) => void;
}

const CourseCurriculum: React.FC<CourseCurriculumProps> = ({ modules, onLessonClick, activeLessonId, selectedModuleId, onModuleChange }) => {

    const selectedModule = useMemo(() => {
        return modules.find(m => m.id === selectedModuleId);
    }, [modules, selectedModuleId]);

    const handleModuleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        onModuleChange(event.target.value);
    };

    return (
        <div className="mt-10">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-5">
                <h2 className="text-2xl font-bold">Aulas</h2>
                <div className="relative">
                    <select 
                        value={selectedModuleId || ''} 
                        onChange={handleModuleChange}
                        className="bg-[#2a2a2a] border border-gray-600 rounded-md py-2 pl-4 pr-10 text-white appearance-none focus:outline-none focus:ring-2 focus:ring-gray-500 cursor-pointer w-full md:max-w-xs"
                    >
                        {modules.map(module => (
                            <option key={module.id} value={module.id}>
                                {module.title}
                            </option>
                        ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                        <ChevronDownIcon />
                    </div>
                </div>
            </div>

            <div>
                {selectedModule && selectedModule.lessons.map((lesson, index) => (
                    <div 
                        key={lesson.id}
                        className={`flex items-center gap-4 py-3 border-b-2 border-gray-800 cursor-pointer hover:bg-gray-800/60 rounded-lg px-2 -mx-2 ${activeLessonId === lesson.id ? 'bg-gray-700/70' : ''}`}
                        onClick={() => onLessonClick(lesson)}
                    >
                        <span className="text-xl font-medium text-gray-400 w-8 text-center">{index + 1}</span>
                        <div className="w-32 flex-shrink-0 aspect-video bg-gray-900 rounded-md overflow-hidden relative">
                            <img 
                                src={lesson.thumbnailUrl}
                                alt={lesson.title}
                                className="w-full h-full object-cover"
                            />
                            {lesson.progress && lesson.progress > 0 && (
                                <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-600/80">
                                    <div className="h-full bg-red-600" style={{ width: `${lesson.progress}%` }}></div>
                                </div>
                            )}
                        </div>
                        <div className="flex-grow">
                            <h4 className={`font-semibold text-base ${activeLessonId === lesson.id ? 'text-red-500' : 'text-white'}`}>{lesson.title}</h4>
                            <p className="text-sm text-gray-400 mt-1 line-clamp-2">
                                {lesson.description || 'Esta é a descrição da aula. Clique para assistir.'}
                            </p>
                        </div>
                        <span className="text-sm text-gray-400 flex-shrink-0">{lesson.duration}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CourseCurriculum;