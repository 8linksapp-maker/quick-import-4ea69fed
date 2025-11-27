import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Course, Lesson, Module as AppModule } from '../components/LoginCard';
import { ClockIcon, VideoCameraIcon, BarChartIcon, PlayIcon } from '../components/Icons';
import CourseCurriculum from '../components/CourseCurriculum';
import { supabase } from '../src/supabaseClient';
import { useCourseAccess } from '../src/hooks/useCourseAccess';
import { getVideoDetails } from '../src/videoUtils';
import { useAuth } from '../src/AuthContext';

// Supabase-specific types
interface SupabaseCourse {
    id: number; title: string; description: string; instructor: string; category: string; poster_url: string; created_at: string; kiwify_product_id?: string;
}
interface SupabaseModule { id: number; title: string; order: number; }
interface SupabaseLesson { id: number; module_id: number; title: string; order: number; description: string; video_url: string; thumbnail_url?: string; }

const CourseOverviewPage: React.FC = () => {
    const { courseId } = useParams<{ courseId: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [course, setCourse] = useState<Course | null>(null);
    const [loading, setLoading] = useState(true);
    const { hasAccess, loading: accessLoading } = useCourseAccess(courseId);
    const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);

    useEffect(() => {
        const fetchCourseData = async () => {
            setLoading(true);
            try {
                if (!courseId) return;

                // 1. Fetch Course Details
                const { data: courseData, error: courseError } = await supabase
                    .from('courses').select('*').eq('id', courseId).single();

                if (courseError) throw courseError;

                // 2. Fetch Modules for the Course
                const { data: modulesData, error: modulesError } = await supabase
                    .from('modules').select('*').eq('course_id', courseId).order('order');

                if (modulesError) throw modulesError;

                // 3. Fetch all Lessons for the modules
                const moduleIds = modulesData.map(m => m.id);
                const { data: lessonsData, error: lessonsError } = await supabase
                    .from('lessons').select('*').in('module_id', moduleIds).order('order');

                if (lessonsError) throw lessonsError;

                // 4. Fetch progress for all lessons in the course
                const lessonIds = lessonsData.map(l => l.id);
                const lessonProgressMap = new Map<number, { progress: number }>();
                if (user && lessonIds.length > 0) {
                    const { data: progressData } = await supabase
                        .from('user_lesson_progress')
                        .select('lesson_id, progress_seconds, total_duration_seconds')
                        .eq('user_id', user.id)
                        .in('lesson_id', lessonIds);

                    if (progressData) {
                        progressData.forEach(p => {
                            const progressPercentage = p.total_duration_seconds > 0 ? (p.progress_seconds / p.total_duration_seconds) * 100 : 0;
                            lessonProgressMap.set(p.lesson_id, { progress: progressPercentage });
                        });
                    }
                }

                // 5. Transform and nest the data
                const nestedModules: AppModule[] = await Promise.all(modulesData.map(async (module) => {
                    const lessonPromises = (lessonsData || [])
                        .filter(lesson => lesson.module_id === module.id)
                        .map(async (lesson) => {
                            // Prioritize the thumbnail from the database if it exists
                            let thumbnailUrl = lesson.thumbnail_url;
                            
                            // If not, fetch it from the video service as a fallback
                            if (!thumbnailUrl) {
                                const details = await getVideoDetails(lesson.video_url);
                                thumbnailUrl = details.thumbnailUrl;
                            }

                            const progressInfo = lessonProgressMap.get(lesson.id);
                            return {
                                id: lesson.id.toString(),
                                title: lesson.title,
                                duration: '5m', // Placeholder
                                completed: progressInfo ? progressInfo.progress >= 95 : false,
                                progress: progressInfo ? progressInfo.progress : 0,
                                thumbnailUrl: thumbnailUrl,
                                description: lesson.description || '',
                                videoUrl: lesson.video_url,
                            };
                        });
                    const lessonsWithThumbnails = await Promise.all(lessonPromises);
                    return {
                        id: module.id.toString(),
                        title: module.title,
                        lessons: lessonsWithThumbnails,
                    };
                }));

                const totalLessons = lessonsData.length;

                const transformedCourse: Course = {
                    id: courseData.id.toString(),
                    title: courseData.title,
                    description: courseData.description || '',
                    instructor: courseData.instructor || '',
                    posterUrl: courseData.poster_url || '',
                    heroUrl: courseData.poster_url || '', // Use poster as hero for now
                    totalLessons: totalLessons,
                    modules: nestedModules,
                    kiwify_product_id: courseData.kiwify_product_id,
                    // --- Placeholder values ---
                    duration: `${Math.ceil(totalLessons * 5 / 60)}h ${totalLessons * 5 % 60}m`, // Estimated duration
                    level: 'All Levels',
                    relevance: '99% Match',
                    tags: [courseData.category || 'Course'],
                    year: new Date(courseData.created_at).getFullYear(),
                    ageRating: 'L',
                    seasons: 1,
                    cast: [courseData.instructor || ''],
                    genres: [courseData.category || 'Uncategorized'],
                    tagsDetail: [],
                    episodes: {},
                };

                setCourse(transformedCourse);
                if (transformedCourse.modules.length > 0) {
                    setSelectedModuleId(transformedCourse.modules[0].id);
                }
            } catch (error) {
                console.error('Failed to fetch course data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchCourseData();
    }, [courseId, user]);

    const handleLessonClick = (lesson: Lesson) => {
        if (course) {
            navigate(`/course/${course.id}/lesson/${lesson.id}`);
        }
    };

    if (loading || accessLoading) {
        return <div className="bg-[#141414] min-h-screen text-white flex justify-center items-center">Carregando detalhes do curso...</div>;
    }

    if (!course) {
        return <div className="bg-[#141414] min-h-screen text-white flex justify-center items-center">Curso não encontrado.</div>;
    }

    return (
        <main className="pt-20 bg-[#141414] text-white min-h-screen">
            {/* Hero Banner */}
            <section className="relative w-full h-[60vh] text-white">
                <img src={course.heroUrl} alt={course.title} className="absolute top-0 left-0 w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/60 bg-gradient-to-t from-[#141414]"></div>
                <div className="relative z-10 h-full flex flex-col justify-end px-4 md:px-16 py-12">
                    <div className="max-w-4xl">
                        <h1 className="text-5xl md:text-6xl font-extrabold">{course.title}</h1>
                        <p className="text-xl text-gray-300 mt-2">com {course.instructor}</p>
                        <div className="flex items-center space-x-6 text-gray-200 mt-4">
                            <div className="flex items-center space-x-2"><ClockIcon /> <span>{course.duration} de vídeo</span></div>
                            <div className="flex items-center space-x-2"><VideoCameraIcon /> <span>{course.totalLessons} aulas</span></div>
                            <div className="flex items-center space-x-2"><BarChartIcon /> <span>{course.level}</span></div>
                        </div>
                        {hasAccess ? (
                            <button 
                                onClick={() => course.modules?.[0]?.lessons?.[0] && handleLessonClick(course.modules[0].lessons[0])} 
                                className="mt-8 flex items-center justify-center bg-[#E50914] text-white font-bold px-10 py-4 rounded hover:bg-red-700 transition text-xl disabled:bg-red-800/50"
                                disabled={!course.modules?.[0]?.lessons?.[0]}
                            >
                                <PlayIcon />
                                <span className="ml-2">Iniciar Curso</span>
                            </button>
                        ) : (
                            <a 
                                href={course.kiwify_product_id} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="mt-8 flex items-center justify-center bg-blue-600 text-white font-bold px-10 py-4 rounded hover:bg-blue-700 transition text-xl"
                            >
                                Comprar Agora
                            </a>
                        )}
                    </div>
                </div>
            </section>
            
            {/* Main Content */}
            <section className="px-4 md:px-16 py-12">
                <div className="max-w-4xl mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                        <div className="lg:col-span-2">
                                <h2 className="text-3xl font-bold mb-4">Sobre este curso</h2>
                                <p className="text-gray-300 leading-relaxed">{course.description}</p>
                                <CourseCurriculum 
                                    modules={course.modules} 
                                    onLessonClick={handleLessonClick} 
                                    selectedModuleId={selectedModuleId}
                                    onModuleChange={setSelectedModuleId}
                                />
                        </div>
                        <div className="lg:col-span-1">
                                {/* Placeholder for instructor info or related courses */}
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
};

export default CourseOverviewPage;
