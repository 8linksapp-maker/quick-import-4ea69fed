import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Course, Lesson, Module, HoverCard } from '../components/LoginCard';
import { PlayIcon, InfoIcon } from '../components/Icons';
import CourseCarousel from '../components/LoginCard';
import CourseDetailModal from '../components/CourseDetailModal';
import Footer from '../components/Footer';
import { supabase } from '../src/supabaseClient';
import { useAuth } from '../src/AuthContext';
import { getVideoDetails } from '../src/videoUtils';
import useDocumentTitle from '../src/hooks/useDocumentTitle';
import { checkModuleLock } from '../src/dripUtils';
import toast from 'react-hot-toast';

type SupabaseCourse = { id: number; title: string; description: string; poster_url: string; instructor: string; category: string; created_at: string; };
type SupabaseModule = { id: number; course_id: number; title: string; thumbnail_url: string; order: number; };
type SupabaseLesson = { id: number; module_id: number; video_url: string; order: number; title: string; description: string; thumbnail_url?: string; };

const mapModuleToCourseCard = (module: SupabaseModule, parentCourse: SupabaseCourse, lessons: SupabaseLesson[]): Course => {
    const totalLessons = lessons.length;
    const duration = `${totalLessons * 5}m`;

    return {
        id: parentCourse.id.toString(),
        cardKey: `module-${module.id}`,
        title: module.title,
        posterUrl: module.thumbnail_url || 'https://placehold.co/400x225',
        totalLessons: totalLessons,
        duration: duration,
        tags: [parentCourse.category || 'Curso'].filter(Boolean),
        description: parentCourse.description || '',
        heroUrl: parentCourse.poster_url || '',
        instructor: parentCourse.instructor || '',
        relevance: '99% Match',
        year: new Date(parentCourse.created_at).getFullYear(),
        ageRating: 'L',
        seasons: 1, 
        cast: [parentCourse.instructor || ''],
        genres: [parentCourse.category || 'Uncategorized'],
        tagsDetail: [],
        episodes: {},
        modules: [],
    };
};

const getVimeoId = (vimeoUrl: string) => {
    const match = /vimeo\.com\/(\d+)/.exec(vimeoUrl);
    return match ? match[1] : null;
};

const getYouTubeId = (youtubeUrl: string) => {
    const match = /(?:youtube\.com\/(?:[^/]+\/.+\/|v\/|embed\/|watch\?v=)|youtu\.be\/)([^"&?\/ ]{11})/.exec(youtubeUrl);
    return match ? match[1] : null;
};

const BrowsePage: React.FC = () => {
    useDocumentTitle('Início');
    const navigate = useNavigate();
    const { user } = useAuth();
    const [detailModalCourse, setDetailModalCourse] = useState<(Course & { initialModuleId?: string }) | null>(null);
    const [heroCourse, setHeroCourse] = useState<Course | null>(null);
    const [carousels, setCarousels] = useState<{title: string, courses: Course[]}[]>([]);
    const [continueWatchingCarousel, setContinueWatchingCarousel] = useState<{title: string, courses: Course[]} | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isDetailLoading, setIsDetailLoading] = useState(false);
    const [durationsUpdated, setDurationsUpdated] = useState(false);

    const [hoverState, setHoverState] = useState<{ status: 'hidden' | 'visible' | 'closing'; course: Course | null; rect: DOMRect | null; scrollY: number | null; isLocked: boolean; availableOn: string; }>({ status: 'hidden', course: null, rect: null, scrollY: null, isLocked: false, availableOn: '' });
    const enterTimeoutRef = useRef<number | null>(null);
    const leaveTimeoutRef = useRef<number | null>(null);

    const [rawCourses, setRawCourses] = useState<SupabaseCourse[]>([]);
    const [rawModules, setRawModules] = useState<SupabaseModule[]>([]);
    const [rawLessons, setRawLessons] = useState<SupabaseLesson[]>([]);

    const clearTimeouts = () => {
        if (enterTimeoutRef.current) clearTimeout(enterTimeoutRef.current);
        if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current);
    };

    const handleMouseEnter = (course: Course, rect: DOMRect) => {
        clearTimeouts();
        enterTimeoutRef.current = window.setTimeout(async () => {
            const moduleId = course.cardKey?.replace('module-', '');
            const moduleData = rawModules.find(m => m.id.toString() === moduleId);

            if (!moduleData) {
                setHoverState({ status: 'visible', course, rect, scrollY: window.scrollY, isLocked: false, availableOn: '' });
                return;
            }

            let enrollmentDate: string | null = null;
            if (user) {
                const { data: subscriptionData } = await supabase
                    .from('subscriptions')
                    .select('start_date')
                    .eq('user_id', user.id)
                    .eq('course_id', moduleData.course_id)
                    .single();
                if (subscriptionData) {
                    enrollmentDate = subscriptionData.start_date;
                }
            }
            
            const { isLocked, availableOn } = checkModuleLock(moduleData, enrollmentDate);
            setHoverState({ status: 'visible', course, rect, scrollY: window.scrollY, isLocked, availableOn });

        }, 800);
    };
    
    const startClosing = () => {
        clearTimeouts();
        setHoverState(prev => ({ ...prev, status: 'closing' }));
    };

    const handleCarouselLeave = () => {
        clearTimeouts();
        leaveTimeoutRef.current = window.setTimeout(() => {
            startClosing();
        }, 100);
    };

    const handleCloseAnimationEnd = () => {
        if (hoverState.status === 'closing') {
            setHoverState({ status: 'hidden', course: null, rect: null, scrollY: null });
        }
    };

    useEffect(() => {
        const handleScroll = () => {
            setHoverState(prev => {
                if (prev.status !== 'hidden') {
                    if (enterTimeoutRef.current) clearTimeout(enterTimeoutRef.current);
                    if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current);
                    return { ...prev, status: 'closing' };
                }
                return prev;
            });
        };

        window.addEventListener('scroll', handleScroll, true);

        return () => {
            window.removeEventListener('scroll', handleScroll, true);
        };
    }, []);

    useEffect(() => {
        const fetchPageData = async () => {
            setIsLoading(true);
            try {
                const { data: configData, error: configError } = await supabase.functions.invoke('get-main-page-config');
                if (configError) throw configError;
                const config = configData.data;

                const { data: coursesData, error: coursesError } = await supabase.from('courses').select('*').eq('is_listed', true);
                if (coursesError) throw coursesError;
                setRawCourses(coursesData || []);

                const { data: modulesData, error: modulesError } = await supabase.from('modules').select('*').order('order');
                if (modulesError) throw modulesError;
                setRawModules(modulesData || []);

                const { data: lessonsData, error: lessonsError } = await supabase.from('lessons').select('id, module_id, video_url, order, title, description, thumbnail_url').order('order');
                if (lessonsError) throw lessonsError;
                setRawLessons(lessonsData || []);

                if (user) {
                    const { data: continueWatchingData, error: continueWatchingError } = await supabase.functions.invoke('get-continue-watching-courses');

                    if (continueWatchingError) {
                        console.error('Error fetching continue watching data:', continueWatchingError);
                    }

                    if (continueWatchingData && continueWatchingData.data) {
                        const continueWatchingCards: Course[] = continueWatchingData.data.map((item: any) => {
                            const progressPercentage = item.total_duration_seconds > 0 ? (item.progress_seconds / item.total_duration_seconds) * 100 : 0;
                            const parentCourse = rawCourses.find(c => c.id === item.course_id);
                            const moduleLessons = rawLessons.filter(l => l.module_id === item.module_id);

                            return {
                                id: item.course_id.toString(),
                                cardKey: `continue-watching-${item.module_id}`,
                                title: item.module_title,
                                posterUrl: item.module_thumbnail_url || 'https://placehold.co/400x225/E74C3C/FFFFFF?text=THUMBNAIL+DO+MÓDULO+FALTANDO',
                                totalLessons: moduleLessons.length,
                                duration: '', // Will be calculated later
                                tags: parentCourse ? [parentCourse.category || 'Curso'].filter(Boolean) : [],
                                description: parentCourse?.description || '',
                                heroUrl: parentCourse?.poster_url || '',
                                instructor: parentCourse?.instructor || '',
                                relevance: '99% Match',
                                year: parentCourse ? new Date(parentCourse.created_at).getFullYear() : 0,
                                ageRating: 'L',
                                seasons: 1,
                                cast: parentCourse ? [parentCourse.instructor || ''] : [],
                                genres: parentCourse ? [parentCourse.category || 'Uncategorized'] : [],
                                tagsDetail: [],
                                episodes: {},
                                modules: [],
                                progress: progressPercentage,
                                firstLessonId: item.lesson_id.toString(),
                                // Continue Watching specific fields
                                isContinueWatching: true,
                                previewVideoUrl: item.lesson_video_url,
                                lessonTitle: item.lesson_title,
                                moduleOrder: item.module_order,
                                lessonOrder: item.lesson_order,
                                progressSeconds: item.progress_seconds,
                                totalDurationSeconds: item.total_duration_seconds,
                            };
                        });

                        if (continueWatchingCards.length > 0) {
                            setContinueWatchingCarousel({
                                title: 'Continuar Assistindo',
                                courses: continueWatchingCards,
                            });
                        } else {
                            setContinueWatchingCarousel(null);
                        }
                    } else {
                        setContinueWatchingCarousel(null);
                    }
                }

                if (config && coursesData) {
                    const heroData = {
                        id: '', title: config.hero_title || '', description: config.hero_description || '', heroUrl: config.hero_video_url || '', posterUrl: '', instructor: '', relevance: '', duration: '', totalLessons: 0, level: '', tags: [], year: 0, ageRating: '', seasons: 0, cast: [], genres: [], tagsDetail: [], episodes: {}, modules: [],
                        heroWatchButtonLink: config.hero_watch_button_link,
                        heroInfoButtonLink: config.hero_info_button_link,
                    };
                    setHeroCourse(heroData);

                    const generatedCarousels = coursesData.map(course => {
                        const courseModules = (modulesData || []).filter(m => m.course_id === course.id);
                        const moduleCards = courseModules.map(module => {
                            const moduleLessons = (lessonsData || []).filter(l => l.module_id === module.id);
                            const firstLesson = moduleLessons.sort((a, b) => a.order - b.order)[0];
                            const moduleAsCourseCard = mapModuleToCourseCard(module, course, moduleLessons);
                            moduleAsCourseCard.previewVideoUrl = firstLesson?.video_url;
                            moduleAsCourseCard.firstLessonId = firstLesson?.id.toString();
                            return moduleAsCourseCard;
                        });
                        return { id: course.id, title: course.title, courses: moduleCards };
                    });

                    const orderedCarousels = [...generatedCarousels].sort((a, b) => {
                        const indexA = config.course_order.indexOf(a.id);
                        const indexB = config.course_order.indexOf(b.id);
                        if (indexA === -1 && indexB === -1) return 0;
                        if (indexA === -1) return 1;
                        if (indexB === -1) return -1;
                        return indexA - indexB;
                    });

                    setCarousels(orderedCarousels);
                }
            } catch (error: any) {
                console.error('Fetch Page Data Error:', error);
                setErrorMessage(error.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchPageData();
    }, [user?.id]);

    useEffect(() => {
        if (!isLoading && carousels.length > 0 && rawLessons.length > 0 && !durationsUpdated) {
            const updateDurations = async () => {
                const updatedCarousels = await Promise.all(carousels.map(async (carousel) => {
                    const updatedCourses = await Promise.all(carousel.courses.map(async (course) => {
                        const moduleId = course.cardKey?.replace('module-', '');
                        if (!moduleId) return course;

                        const moduleLessons = rawLessons.filter(l => l.module_id.toString() === moduleId);
                        if (moduleLessons.length === 0) return course;

                        const durations = await Promise.all(moduleLessons.map(l => getVideoDetails(l.video_url).then(d => d.duration)));
                        const totalSeconds = durations.reduce((acc, d) => acc + (d || 0), 0);
                        
                        if (totalSeconds > 0) {
                            const totalMinutes = Math.round(totalSeconds / 60);
                            return { ...course, duration: `${totalMinutes}m` };
                        }
                        return course;
                    }));
                    return { ...carousel, courses: updatedCourses };
                }));
                setCarousels(updatedCarousels);
                setDurationsUpdated(true);
            };
            updateDurations();
        }
    }, [isLoading, carousels, rawLessons, durationsUpdated]);

    const handleNavigateToOverview = async (course: Course) => {
        // course object here is actually a module formatted as a course
        const moduleId = course.cardKey?.replace('module-', '');
        const moduleData = rawModules.find(m => m.id.toString() === moduleId);

        if (!moduleData) {
            console.error("Could not find module data for clicked card.");
            // Fallback navigation to the parent course page
            navigate(`/course/${course.id}`);
            return;
        }

        let enrollmentDate: string | null = null;
        if (user) {
            const { data: subscriptionData } = await supabase
                .from('subscriptions')
                .select('start_date')
                .eq('user_id', user.id)
                .eq('course_id', moduleData.course_id)
                .single();
            if (subscriptionData) {
                enrollmentDate = subscriptionData.start_date;
            }
        }
        
        const { isLocked, availableOn } = checkModuleLock(moduleData, enrollmentDate);

        if (isLocked) {
            toast.error(`Este módulo será liberado ${availableOn.toLowerCase()}.`);
            return;
        }

        // If not locked, proceed to lesson
        if (course.firstLessonId) {
            navigate(`/course/${course.id}/lesson/${course.firstLessonId}`);
        } else {
            // Fallback if no first lesson is found
            navigate(`/course/${course.id}`);
        }
    };

    const handleOpenDetailModal = async (course: Course) => {
        setIsDetailLoading(true);
        const parentCourse = rawCourses.find(c => c.id.toString() === course.id);
        const moduleId = course.cardKey?.replace('module-', '');

        setDetailModalCourse({
            ...course,
            id: parentCourse?.id.toString() || course.id,
            title: parentCourse?.title || course.title,
            description: parentCourse?.description || course.description,
            instructor: parentCourse?.instructor || course.instructor,
            heroUrl: parentCourse?.poster_url || course.heroUrl,
            cast: [parentCourse?.instructor || course.instructor].filter(Boolean),
            genres: [parentCourse?.category || ''].filter(Boolean),
            modules: [],
            initialModuleId: moduleId,
        });

        if (!parentCourse) {
            console.error("Parent course not found for details modal.");
            setIsDetailLoading(false);
            return;
        }

        // --- INÍCIO DA NOVA LÓGICA ---
        // 1. Buscar a data de inscrição do usuário
        let enrollmentDate: string | null = null;
        if (user) {
            const { data: subscriptionData } = await supabase
                .from('subscriptions')
                .select('start_date')
                .eq('user_id', user.id)
                .eq('course_id', parentCourse.id)
                .single();
            if (subscriptionData) {
                enrollmentDate = subscriptionData.start_date;
            }
        }

        // 2. Buscar módulos e lições
        const courseModules = rawModules.filter(m => m.course_id === parentCourse.id);
        const courseLessonIds = rawLessons.filter(l => courseModules.some(m => m.id === l.module_id)).map(l => l.id);

        const lessonProgressMap = new Map<number, { progress: number }>();
        if (user && courseLessonIds.length > 0) {
            const { data: progressData } = await supabase
                .from('user_lesson_progress')
                .select('lesson_id, progress_seconds, total_duration_seconds')
                .eq('user_id', user.id)
                .in('lesson_id', courseLessonIds);

            if (progressData) {
                progressData.forEach(p => {
                    const progressPercentage = p.total_duration_seconds > 0 ? (p.progress_seconds / p.total_duration_seconds) * 100 : 0;
                    lessonProgressMap.set(p.lesson_id, { progress: progressPercentage });
                });
            }
        }
        
        // 3. Construir módulos e aplicar a trava
        const structuredModules: AppModule[] = await Promise.all(courseModules.map(async (module) => {
            const { isLocked, availableOn } = checkModuleLock(module, enrollmentDate); // Usando o "cérebro"

            const lessonPromises = rawLessons
                .filter(l => l.module_id === module.id)
                .sort((a, b) => a.order - b.order)
                .map(async (lesson) => {
                    let thumbnailUrl = lesson.thumbnail_url;
                    let duration = lesson.duration_seconds;

                    // Fallback to fetch details only if necessary
                    if (!thumbnailUrl || !duration) {
                        const details = await getVideoDetails(lesson.video_url);
                        thumbnailUrl = thumbnailUrl ?? details.thumbnailUrl;
                        duration = duration ?? details.duration;
                    }
                    
                    const durationInMinutes = duration ? Math.round(duration / 60) : 1;
                    const durationString = `${durationInMinutes > 0 ? durationInMinutes : 1}m`;
                    const progressInfo = lessonProgressMap.get(lesson.id);
                    return {
                        id: lesson.id.toString(),
                        title: lesson.title || `Aula ${lesson.order}`,
                        duration: durationString,
                        completed: progressInfo ? progressInfo.progress >= 95 : false,
                        progress: progressInfo ? progressInfo.progress : 0,
                        description: lesson.description || '',
                        thumbnailUrl: thumbnailUrl,
                        videoUrl: lesson.video_url,
                    };
                });
            
            const moduleLessons = await Promise.all(lessonPromises);

            return {
                id: module.id.toString(),
                title: module.title,
                lessons: moduleLessons,
                isLocked,
                availableOn,
            };
        }));
        // --- FIM DA NOVA LÓGICA ---

        setDetailModalCourse(prevCourse => ({
            ...(prevCourse as Course & { initialModuleId?: string }),
            modules: structuredModules,
        }));

        setIsDetailLoading(false);
    };

    const handleCloseDetailModal = () => {
        setDetailModalCourse(null);
    };

    const handleNavigateToLesson = (lesson: Lesson) => {
        if (detailModalCourse) {
            navigate(`/course/${detailModalCourse.id}/lesson/${lesson.id}`);
        }
    };

    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        const video = videoRef.current;
        if (video && heroCourse?.heroUrl) {
            const handleTimeUpdate = () => {
                if (video.currentTime >= 60) {
                    video.pause();
                }
            };
            video.addEventListener('timeupdate', handleTimeUpdate);
            video.play().catch(error => {
                console.error("Video autoplay was prevented:", error);
            });
            return () => {
                video.removeEventListener('timeupdate', handleTimeUpdate);
            };
        }
    }, [heroCourse?.heroUrl]);

    if (isLoading) {
        return <div className="bg-[#141414] min-h-screen text-white flex justify-center items-center">Carregando...</div>;
    }

    if (errorMessage) {
        return <div className="bg-[#141414] min-h-screen text-white flex justify-center items-center">Error: {errorMessage}</div>;
    }

    if (!heroCourse) {
        return <div className="bg-[#141414] min-h-screen text-white flex justify-center items-center">Não foi possível carregar o conteúdo da página.</div>;
    }

    return (
        <>
            <section className="relative lg:h-screen w-full overflow-hidden">
                <div className="relative h-[56.25vw] max-h-[80vh] lg:absolute lg:top-0 lg:left-0 lg:w-full lg:h-full lg:max-h-none">
                    {(() => {
                        const url = heroCourse.heroUrl;
                        const vimeoId = getVimeoId(url);
                        const youTubeId = getYouTubeId(url);

                        if (vimeoId) {
                            return (
                                <iframe
                                    src={`https://player.vimeo.com/video/${vimeoId}?autoplay=1&autopause=0&muted=1&background=1`}
                                    className="absolute top-0 left-0 w-full h-full scale-125"
                                    frameBorder="0"
                                    allow="autoplay; fullscreen; picture-in-picture"
                                    allowFullScreen
                                ></iframe>
                            );
                        }

                        if (youTubeId) {
                            return (
                                <iframe
                                    src={`https://www.youtube.com/embed/${youTubeId}?autoplay=1&mute=1&controls=0&showinfo=0&autohide=1&modestbranding=1`}
                                    className="absolute top-0 left-0 w-full h-full scale-125"
                                    frameBorder="0"
                                    allow="autoplay; encrypted-media; picture-in-picture"
                                    allowFullScreen
                                ></iframe>
                            );
                        }

                        return (
                            <video
                                ref={videoRef}
                                key={url}
                                src={url}
                                autoPlay
                                muted
                                loop
                                playsInline
                                className="absolute top-0 left-0 w-full h-full object-cover"
                            />
                        );
                    })()}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-transparent"></div>
                </div>
                
                <div className="relative p-4 -mt-32 md:-mt-24 lg:absolute lg:mt-0 lg:bottom-[30%] lg:left-16 z-10 max-w-2xl">
                    <h1 className="text-3xl md:text-5xl lg:text-6xl font-extrabold">{heroCourse.title}</h1>
                    <p className="mt-4 text-sm md:text-base lg:text-lg max-w-md">{heroCourse.description}</p>
                    <div className="mt-6 flex items-center space-x-3">
                        {heroCourse.heroWatchButtonLink && (
                            <Link to={heroCourse.heroWatchButtonLink} className="flex items-center justify-center bg-white text-black font-semibold px-3 py-1.5 md:px-8 md:py-3 rounded hover:bg-gray-200 transition text-base md:text-2xl">
                                <PlayIcon className="w-4 h-4 md:w-7 md:h-7" />
                                <span className="ml-1 md:ml-3">Assistir</span>
                            </Link>
                        )}
                        {heroCourse.heroInfoButtonLink && (
                            <Link to={heroCourse.heroInfoButtonLink} className="flex items-center justify-center bg-gray-500/70 text-white font-semibold px-3 py-1.5 md:px-6 md:py-2 rounded hover:bg-gray-500/90 transition text-xs md:text-2xl">
                                <InfoIcon className="w-6 h-6 md:w-11 md:h-11" />
                                <span className="ml-0.5 md:ml-3">Mais Informações</span>
                            </Link>
                        )}
                    </div>
                </div>
            </section>
            
            <div className={`-mt-2 md:-mt-8 lg:-mt-24 relative z-20`}>
                <main className="space-y-16 pb-24">
                    {continueWatchingCarousel && (
                        <CourseCarousel
                            key={continueWatchingCarousel.title}
                            title={continueWatchingCarousel.title}
                            courses={continueWatchingCarousel.courses}
                            onCardClick={handleNavigateToOverview}
                            onShowDetails={handleOpenDetailModal}
                            onMouseEnter={handleMouseEnter}
                            onMouseLeave={handleCarouselLeave}
                            isFirstCarousel
                        />
                    )}
                    {carousels.map((carousel, index) => (
                        carousel.courses.length > 0 && (
                            <CourseCarousel
                                key={carousel.title}
                                title={carousel.title}
                                courses={carousel.courses}
                                onCardClick={handleNavigateToOverview}
                                onShowDetails={handleOpenDetailModal}
                                onMouseEnter={handleMouseEnter}
                                onMouseLeave={handleCarouselLeave}
                                isFirstCarousel={!continueWatchingCarousel && index === 0}
                            />
                        )
                    ))}
                </main>

                <Footer />
            </div>

            {hoverState.status !== 'hidden' && hoverState.course && hoverState.rect && hoverState.scrollY !== null &&
                <HoverCard 
                    course={hoverState.course} 
                    rect={hoverState.rect} 
                    scrollY={hoverState.scrollY}
                    onCardClick={handleNavigateToOverview}
                    onShowDetails={handleOpenDetailModal}
                    startClosing={startClosing}
                    isClosing={hoverState.status === 'closing'}
                    onCloseAnimationEnd={handleCloseAnimationEnd}
                    onMouseEnter={clearTimeouts}
                />
            }

            {detailModalCourse && (
                <CourseDetailModal 
                    course={detailModalCourse} 
                    onClose={handleCloseDetailModal}
                    onLessonClick={handleNavigateToLesson} 
                    isLoading={isDetailLoading}
                    initialModuleId={detailModalCourse.initialModuleId}
                />
            )}
        </>
    );
};

export default BrowsePage;