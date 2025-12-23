// @refresh reset
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import NetflixPlayer from '../components/NetflixPlayer';
import { Course, Lesson, Module as AppModule } from '../components/LoginCard';
import CourseCurriculum from '../components/CourseCurriculum';
import { PaperAirplaneIcon, AcademicCapIcon, CheckCircleIcon, ArrowRightIcon } from '../components/Icons';
import { supabase } from '../src/supabaseClient';
import { getEmbedUrl, getVideoDetails } from '../src/videoUtils';
import { useCourseAccess } from '../src/hooks/useCourseAccess';
import { useAuth } from '../src/AuthContext';
import useDocumentTitle from '../src/hooks/useDocumentTitle';
import { checkModuleLock } from '../src/dripUtils';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const ChatInterface: React.FC<{ lessonId: string }> = ({ lessonId }) => {
    const storageKey = `chatHistory_${lessonId}`;

    const [messages, setMessages] = useState<ChatMessage[]>(() => {
        try {
            const savedMessages = localStorage.getItem(storageKey);
            if (savedMessages) {
                const parsed = JSON.parse(savedMessages);
                if (Array.isArray(parsed) && parsed.length > 0) { return parsed; } 
            }
        } catch (error) { console.error("Failed to parse chat history from localStorage", error); }
        return [{ role: 'assistant', content: 'Olá! Sou seu assistente de IA. Tire qualquer dúvida que tiver sobre o conteúdo desta aula.' }];
    });

    useEffect(() => { localStorage.setItem(storageKey, JSON.stringify(messages)); }, [messages, storageKey]);

    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<null | HTMLDivElement>(null);

    const scrollToBottom = () => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }

    useEffect(() => { scrollToBottom(); }, [messages]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || loading) return;

        const userMessage: ChatMessage = { role: 'user', content: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setLoading(true);

        try {
            const { data, error } = await supabase.functions.invoke('ask-lesson-question', { body: { lessonId: parseInt(lessonId), question: input } });
            if (error) throw error;
            const assistantMessage: ChatMessage = { role: 'assistant', content: data.answer };
            setMessages(prev => [...prev, assistantMessage]);
        } catch (error: any) {
            const displayError = error.context?.error?.message || error.message;
            const errorMessage: ChatMessage = { role: 'assistant', content: `Desculpe, ocorreu um erro: ${displayError}` };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="mt-8 bg-[#212121] rounded-lg p-4 flex flex-col h-[500px]">
            <div className="flex-grow overflow-y-auto pr-2 space-y-4">
                {messages.map((msg, index) => (
                    <div key={index} className={`flex items-start space-x-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                        {msg.role === 'assistant' && (<div className="bg-gray-700 p-2 rounded-full"><AcademicCapIcon /></div>)}
                        <div className={`p-3 rounded-lg max-w-lg ${msg.role === 'user' ? 'bg-blue-600' : 'bg-[#2a2a2a]'}`}><p className="text-sm whitespace-pre-wrap">{msg.content}</p></div>
                    </div>
                ))}
                {loading && (
                    <div className="flex items-start space-x-3">
                         <div className="bg-gray-700 p-2 rounded-full"><AcademicCapIcon /></div>
                         <div className="bg-[#2a2a2a] p-3 rounded-lg max-w-lg"><p className="text-sm">Pensando...</p></div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>
            <div className="mt-4 pt-4 border-t border-gray-700">
                <form onSubmit={handleSubmit} className="relative">
                    <input type="text" placeholder={loading ? 'Aguarde a resposta...' : 'Tire sua dúvida sobre esta aula...'} value={input} onChange={(e) => setInput(e.target.value)} className="w-full bg-[#2a2a2a] border border-gray-600 rounded-lg py-3 pl-4 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-red-600 disabled:opacity-50" disabled={loading} />
                    <button type="submit" disabled={loading} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white disabled:opacity-50"><PaperAirplaneIcon /></button>
                </form>
            </div>
        </div>
    );
};

const findNextLesson = (course: Course, currentLessonId: string): Lesson | null => {
    if (!course || !course.modules) return null;
    let foundCurrent = false;
    for (const module of course.modules) {
        if (module.isLocked) continue;
        for (const lesson of module.lessons) {
            if (foundCurrent) return lesson;
            if (lesson.id === currentLessonId) foundCurrent = true;
        }
    }
    return null;
};

const LessonPage: React.FC = () => {
    const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [course, setCourse] = useState<Course | null>(null);
    const [currentLesson, setCurrentLesson] = useState<any | null>(null);
    const [displayTitle, setDisplayTitle] = useState<string>('');
    const [nextLesson, setNextLesson] = useState<Lesson | null>(null);
    const [loading, setLoading] = useState(true);
    const [isCompleted, setIsCompleted] = useState(false);
    const [activeTab, setActiveTab] = useState<'description' | 'chat' | 'lessons'>('description');
    const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
    const { hasAccess, loading: accessLoading } = useCourseAccess(courseId);

    useDocumentTitle(currentLesson ? currentLesson.title : 'Carregando aula...');

    useEffect(() => {
        const fetchData = async () => {
            if (!courseId || !lessonId || !user) return;
            setLoading(true);

            let enrollmentDate: string | null = null;
            const { data: subscriptionData } = await supabase
                .from('subscriptions')
                .select('start_date')
                .eq('user_id', user.id)
                .eq('course_id', courseId)
                .single();

            if (subscriptionData) {
                enrollmentDate = subscriptionData.start_date;
            }

            const [lessonRes, courseRes, modulesRes] = await Promise.all([
                supabase.from('lessons').select('*').eq('id', lessonId).single(),
                supabase.from('courses').select('*').eq('id', courseId).single(),
                supabase.from('modules').select('*, release_date, days_after_enrollment').eq('course_id', courseId).order('order')
            ]);
            
            if (lessonRes.error || courseRes.error || modulesRes.error) {
                console.error(lessonRes.error || courseRes.error || modulesRes.error);
                setLoading(false);
                return;
            }
            
            const lessonData = lessonRes.data;
            const courseData = courseRes.data;
            const modulesData = modulesRes.data || [];

            const moduleIds = modulesData.map(m => m.id);
            const { data: lessonsData } = await supabase.from('lessons').select('*, description, thumbnail_url, duration_seconds').in('module_id', moduleIds).order('order');
            
            const lessonIds = (lessonsData || []).map(l => l.id);
            const { data: progressData } = await supabase.from('user_lesson_progress').select('lesson_id, progress_seconds, total_duration_seconds').eq('user_id', user.id).in('lesson_id', lessonIds);
            
            const completedLessonIds = new Set<number>();
            progressData?.forEach(p => {
                if (p.progress_seconds && p.total_duration_seconds && p.progress_seconds >= p.total_duration_seconds * 0.95) {
                    completedLessonIds.add(p.lesson_id);
                }
            });

            const nestedModules: AppModule[] = await Promise.all(modulesData.map(async (module) => {
                const { isLocked, availableOn } = checkModuleLock(module, enrollmentDate);

                const lessonPromises = (lessonsData || []).filter(l => l.module_id === module.id).map(async (l) => {
                    let duration = l.duration_seconds;
                    let thumbnailUrl = l.thumbnail_url;
                    if (!duration || !thumbnailUrl) {
                        const details = await getVideoDetails(l.video_url);
                        duration = duration ?? details.duration;
                        thumbnailUrl = thumbnailUrl ?? details.thumbnailUrl;
                    }
                    const durationInMinutes = duration ? Math.round(duration / 60) : 1;
                    return {
                        id: l.id.toString(), title: l.title, duration: `${durationInMinutes > 0 ? durationInMinutes : 1}m`,
                        completed: completedLessonIds.has(l.id), thumbnailUrl: thumbnailUrl || '',
                        description: l.description || '', videoUrl: l.video_url,
                    };
                });
                const lessonsWithThumbnails = await Promise.all(lessonPromises);
                
                return { 
                    id: module.id.toString(), title: module.title, lessons: lessonsWithThumbnails,
                    isLocked,
                    availableOn,
                };
            }));

            const transformedCourse: Course = {
                id: courseData.id.toString(), title: courseData.title, modules: nestedModules,
                description: '', instructor: '', posterUrl: '', heroUrl: '', totalLessons: 0, duration: '', level: '', relevance: '', tags: [], year: 0, ageRating: '', seasons: 0, cast: [], genres: [], tagsDetail: [], episodes: {},
            };
            
            if (courseData && lessonData) {
                setDisplayTitle(`${courseData.title} A${lessonData.order} ${lessonData.title}`);
            }
            setCurrentLesson(lessonData);
            setCourse(transformedCourse);
            setIsCompleted(completedLessonIds.has(parseInt(lessonId)));
            setLoading(false);
        };

        fetchData();
    }, [courseId, lessonId, user?.id]);

    useEffect(() => {
        if (course && lessonId) {
            const next = findNextLesson(course, lessonId);
            setNextLesson(next);
        }
    }, [course, lessonId]);

    // Security Check: Redirect if the lesson is in a locked module
    useEffect(() => {
        if (course && lessonId) {
            const parentModule = course.modules.find(m => m.lessons.some(l => l.id === lessonId));
            if (parentModule && parentModule.isLocked) {
                console.warn(`ACCESS DENIED: User tried to access lesson ${lessonId} which is in a locked module.`);
                navigate(`/course/${courseId}`, { replace: true });
            }
        }
    }, [course, lessonId, courseId, navigate]);

    useEffect(() => {
        if (course && lessonId) {
            const findModuleIdForLesson = (lessonId: string): string | null => {
                const module = course.modules.find(m => m.lessons.some(l => l.id === lessonId));
                return module ? module.id : null;
            };
            const moduleId = findModuleIdForLesson(lessonId);
            setSelectedModuleId(moduleId);
        }
    }, [course, lessonId]);

    const handleNavigateToNext = () => {
        if (nextLesson) {
            navigate(`/course/${courseId}/lesson/${nextLesson.id}`);
        }
    };

    const handleLessonClick = (lesson: Lesson) => {
        const parentModule = course?.modules.find(m => m.lessons.some(l => l.id === lesson.id));
        if (parentModule?.isLocked) {
            return;
        }
        navigate(`/course/${courseId}/lesson/${lesson.id}`);
    };

    if (loading || accessLoading) {
        return <div className="bg-[#141414] min-h-screen text-white flex justify-center items-center">Carregando aula...</div>;
    }

    if (!course || !currentLesson || !lessonId) {
        return <div className="bg-[#141414] min-h-screen text-white flex justify-center items-center">Aula não encontrada.</div>;
    }

    return (
        <main className="bg-[#000] text-white min-h-screen">
            <div className="flex flex-col lg:flex-row">
                <div className="w-full lg:w-3/4 bg-[#141414] pt-20">
                    <div className="aspect-video bg-black">
                        <NetflixPlayer url={currentLesson.video_url} shortTitle={currentLesson.title} longTitle={displayTitle} />
                    </div>
                    <div className="p-8">
                        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-4">
                            <h1 className="text-3xl font-bold">{currentLesson.title}</h1>
                            <div className="flex items-center space-x-2 flex-shrink-0">
                                <button onClick={() => {}} disabled={isCompleted} className={`flex items-center justify-center px-3 py-2 rounded-md font-semibold transition-colors text-xs sm:text-sm ${isCompleted ? 'bg-green-600/50 text-white/70 cursor-not-allowed' : 'bg-zinc-700 hover:bg-zinc-600 text-white'}`}>
                                    {isCompleted ? <><CheckCircleIcon className="w-5 h-5 mr-2"/> Concluída</> : 'Marcar como Concluída'}
                                </button>
                                <button onClick={handleNavigateToNext} disabled={!nextLesson} className="flex items-center justify-center px-3 py-2 rounded-md font-semibold transition-colors text-xs sm:text-sm bg-red-600 hover:bg-red-700 text-white disabled:bg-red-600/50 disabled:cursor-not-allowed">
                                    <span>Próxima Aula</span>
                                    <ArrowRightIcon className="w-5 h-5 ml-2"/>
                                </button>
                            </div>
                        </div>
                        <div className="mt-6">
                            <div className="flex border-b border-gray-700">
                                <button onClick={() => setActiveTab('description')} className={`py-2 px-4 text-sm font-medium transition-colors ${activeTab === 'description' ? 'border-b-2 border-red-600 text-white' : 'text-gray-400 hover:text-gray-200'}`}>Descrição</button>
                                <button onClick={() => setActiveTab('chat')} className={`py-2 px-4 text-sm font-medium transition-colors ${activeTab === 'chat' ? 'border-b-2 border-red-600 text-white' : 'text-gray-400 hover:text-gray-200'}`}>Chat IA</button>
                                <button onClick={() => setActiveTab('lessons')} className={`py-2 px-4 text-sm font-medium transition-colors lg:hidden ${activeTab === 'lessons' ? 'border-b-2 border-red-600 text-white' : 'text-gray-400 hover:text-gray-200'}`}>Aulas</button>
                            </div>
                            <div className="p-6">
                                {activeTab === 'description' && (<p className="text-gray-300">{currentLesson.description}</p>)}
                                {activeTab === 'chat' && (<ChatInterface lessonId={lessonId} />)}
                                {activeTab === 'lessons' && (
                                    <div className="lg:hidden">
                                        <h2 className="text-xl font-bold mb-4">{course.title}</h2>
                                        <CourseCurriculum modules={course.modules} onLessonClick={handleLessonClick} activeLessonId={lessonId} selectedModuleId={selectedModuleId} onModuleChange={setSelectedModuleId} />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                <aside className="w-full lg:w-1/4 bg-[#1a1a1a] h-screen overflow-y-auto lg:sticky top-0 pt-20 hidden lg:block">
                    <div className="p-6">
                        <h2 className="text-xl font-bold mb-4">{course.title}</h2>
                        <CourseCurriculum modules={course.modules} onLessonClick={handleLessonClick} activeLessonId={lessonId} selectedModuleId={selectedModuleId} onModuleChange={setSelectedModuleId} />
                    </div>
                </aside>
            </div>
        </main>
    );
};

export default LessonPage;
