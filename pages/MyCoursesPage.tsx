import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Course } from '../components/LoginCard';
import { useAuth } from '../src/AuthContext';
import { supabase } from '../src/supabaseClient';

const MyCoursesGrid: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchUserCourses = async () => {
            if (!user) {
                setLoading(false);
                setError("Você precisa estar logado para ver seus cursos.");
                return;
            }

            try {
                setLoading(true);

                // 1. Fetch course IDs from user_courses
                const { data: userCoursesData, error: userCoursesError } = await supabase
                    .from('user_courses')
                    .select('course_id')
                    .eq('user_id', user.id);

                if (userCoursesError) throw userCoursesError;

                if (userCoursesData.length === 0) {
                    setCourses([]);
                    setLoading(false);
                    return;
                }

                const courseIds = userCoursesData.map(uc => uc.course_id);

                // 2. Fetch course details from courses table
                const { data: coursesData, error: coursesError } = await supabase
                    .from('courses')
                    .select('*')
                    .in('id', courseIds);

                if (coursesError) throw coursesError;

                // 3. Map Supabase data to Course type
                const formattedCourses: Course[] = coursesData.map(course => ({
                    id: course.id.toString(),
                    posterUrl: course.poster_url || 'https://placehold.co/400x225',
                    title: course.title,
                    // --- Map other fields as necessary, using placeholders if needed ---
                    heroUrl: course.poster_url || '',
                    instructor: course.instructor || '',
                    description: course.description || '',
                    relevance: '', 
                    duration: '', 
                    totalLessons: 0, 
                    level: '', 
                    tags: [], 
                    year: new Date(course.created_at).getFullYear(),
                    ageRating: '', 
                    seasons: 0, 
                    cast: [], 
                    genres: [], 
                    tagsDetail: [], 
                    episodes: {}, 
                    modules: [],
                }));

                setCourses(formattedCourses);
            } catch (err: any) {
                console.error("Error fetching user courses:", err);
                setError(err.message || "Ocorreu um erro ao buscar seus cursos.");
            } finally {
                setLoading(false);
            }
        };

        fetchUserCourses();
    }, [user?.id]);

    const handleCardClick = (course: Course) => {
        navigate(`/course/${course.id}`);
    };

    if (loading) {
        return <div className="text-center py-10">Carregando seus cursos...</div>;
    }

    if (error) {
        return <div className="text-center py-10 text-red-500">{error}</div>;
    }
    
    if (courses.length === 0) {
        return <div className="text-center py-10">Você ainda não tem acesso a nenhum curso.</div>;
    }

    return (
        <section className="px-4 md:px-16 py-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-8">Meus Cursos</h1>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {courses.map(course => (
                    <div key={course.id} className="group relative aspect-video cursor-pointer" onClick={() => handleCardClick(course)}>
                        <img src={course.posterUrl} alt={course.title} className="w-full h-full object-cover rounded-md" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <h3 className="text-white text-center font-bold text-lg p-2">{course.title}</h3>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}
import useDocumentTitle from '../src/hooks/useDocumentTitle';

const MyCoursesPage: React.FC = () => {
    useDocumentTitle('Meus Cursos');
    return (
        <main className="pt-24 text-white">
            <MyCoursesGrid />
        </main>
    );
};

export default MyCoursesPage;