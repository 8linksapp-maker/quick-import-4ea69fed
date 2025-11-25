import React, { useState, useEffect } from 'react';
import { supabase } from '../../src/supabaseClient';
import LibraryModal from '../../components/admin/LibraryModal';

interface Course {
    id: string;
    title: string;
}

interface B2File {
    key: string;
    url: string;
}

const EditMainPage: React.FC = () => {
    const [heroTitle, setHeroTitle] = useState('');
    const [heroDescription, setHeroDescription] = useState('');
    const [heroVideoUrl, setHeroVideoUrl] = useState('');
    const [heroWatchButtonLink, setHeroWatchButtonLink] = useState('');
    const [heroInfoButtonLink, setHeroInfoButtonLink] = useState('');
    const [courses, setCourses] = useState<Course[]>([]);
    const [courseOrder, setCourseOrder] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isLibraryModalOpen, setIsLibraryModalOpen] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch main page config
                const { data: configData, error: configError } = await supabase.functions.invoke('get-main-page-config');
                if (configError) throw configError;
                if (configData.data) {
                    setHeroTitle(configData.data.hero_title);
                    setHeroDescription(configData.data.hero_description);
                    setHeroVideoUrl(configData.data.hero_video_url);
                    setHeroWatchButtonLink(configData.data.hero_watch_button_link || '');
                    setHeroInfoButtonLink(configData.data.hero_info_button_link || '');
                    setCourseOrder(configData.data.course_order || []);
                }

                // Fetch courses
                const { data: coursesData, error: coursesError } = await supabase.functions.invoke('get-courses');
                if (coursesError) throw coursesError;
                setCourses(coursesData.data || []);

            } catch (error: any) {
                setError(error.message);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const handleSave = async () => {
        try {
            setLoading(true);
            setError(null);

            const { error } = await supabase.functions.invoke('update-main-page-config', {
                body: {
                    hero_title: heroTitle,
                    hero_description: heroDescription,
                    hero_video_url: heroVideoUrl,
                    hero_watch_button_link: heroWatchButtonLink,
                    hero_info_button_link: heroInfoButtonLink,
                    course_order: courseOrder,
                }
            });

            if (error) throw error;

            alert('Página principal atualizada com sucesso!');

        } catch (error: any) {
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectVideoFromLibrary = (file: B2File) => {
        setHeroVideoUrl(file.url);
    };

    const moveCourse = (index: number, direction: 'up' | 'down') => {
        const newOrder = [...courseOrder];
        const newIndex = direction === 'up' ? index - 1 : index + 1;

        if (newIndex >= 0 && newIndex < newOrder.length) {
            const temp = newOrder[index];
            newOrder[index] = newOrder[newIndex];
            newOrder[newIndex] = temp;
            setCourseOrder(newOrder);
        }
    };
    
    const orderedCourses = courseOrder.map(id => courses.find(c => c.id === id)).filter((c): c is Course => !!c);
    const unorderedCourses = courses.filter(c => !courseOrder.includes(c.id));


    if (loading) return <div>Loading...</div>;
    if (error) return <div>Error: {error}</div>;

    return (
        <div>
            <LibraryModal
                isOpen={isLibraryModalOpen}
                onClose={() => setIsLibraryModalOpen(false)}
                onFileSelect={handleSelectVideoFromLibrary}
            />
            <h2 className="text-2xl md:text-3xl font-bold mb-6">Editar Página Principal</h2>

            <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-lg shadow-lg p-6 md:p-8 mb-8">
                <h3 className="text-xl font-bold mb-6">Seção Hero</h3>
                <div className="grid grid-cols-1 gap-6">
                    <div>
                        <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-2">Título</label>
                        <input
                            type="text"
                            id="title"
                            value={heroTitle}
                            onChange={(e) => setHeroTitle(e.target.value)}
                            placeholder="Ex: CursosFlix"
                            className="w-full bg-black/20 border border-white/20 rounded-md py-2 px-4 text-white placeholder-gray-500 focus:ring-2 focus:ring-red-500 focus:border-red-500 transition"
                        />
                    </div>
                    <div>
                        <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-2">Descrição</label>
                        <textarea
                            id="description"
                            rows={4}
                            value={heroDescription}
                            onChange={(e) => setHeroDescription(e.target.value)}
                            placeholder="Uma breve descrição do item em destaque..."
                            className="w-full bg-black/20 border border-white/20 rounded-md py-2 px-4 text-white placeholder-gray-500 focus:ring-2 focus:ring-red-500 focus:border-red-500 transition"
                        ></textarea>
                    </div>
                    <div>
                        <label htmlFor="heroUrl" className="block text-sm font-medium text-gray-300 mb-2">URL do Vídeo Hero</label>
                        <input
                            type="text"
                            id="heroUrl"
                            value={heroVideoUrl}
                            onChange={(e) => setHeroVideoUrl(e.target.value)}
                            placeholder="https://..."
                            className="w-full bg-black/20 border border-white/20 rounded-md py-2 px-4 text-white placeholder-gray-500 focus:ring-2 focus:ring-red-500 focus:border-red-500 transition"
                        />
                        <button 
                            type="button"
                            onClick={() => setIsLibraryModalOpen(true)}
                            className="mt-2 w-full sm:w-auto bg-gray-600 hover:bg-gray-500 text-white font-semibold py-2 px-4 rounded-md transition-colors"
                        >
                            Selecionar da Biblioteca
                        </button>
                    </div>
                    <div>
                        <label htmlFor="watchLink" className="block text-sm font-medium text-gray-300 mb-2">Link do Botão "Assistir"</label>
                        <input
                            type="text"
                            id="watchLink"
                            value={heroWatchButtonLink}
                            onChange={(e) => setHeroWatchButtonLink(e.target.value)}
                            placeholder="/curso/id/lesson/id"
                            className="w-full bg-black/20 border border-white/20 rounded-md py-2 px-4 text-white placeholder-gray-500 focus:ring-2 focus:ring-red-500 focus:border-red-500 transition"
                        />
                    </div>
                    <div>
                        <label htmlFor="infoLink" className="block text-sm font-medium text-gray-300 mb-2">Link do Botão "Mais Informações"</label>
                        <input
                            type="text"
                            id="infoLink"
                            value={heroInfoButtonLink}
                            onChange={(e) => setHeroInfoButtonLink(e.target.value)}
                            placeholder="/curso/id"
                            className="w-full bg-black/20 border border-white/20 rounded-md py-2 px-4 text-white placeholder-gray-500 focus:ring-2 focus:ring-red-500 focus:border-red-500 transition"
                        />
                    </div>
                </div>
            </div>

            <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-lg shadow-lg p-6 md:p-8">
                <h3 className="text-xl font-bold mb-4">Ordem dos Cursos</h3>
                <div className="space-y-2">
                    {orderedCourses.map((course, index) => (
                        <div key={course.id} className="flex items-center justify-between bg-black/20 p-2 rounded">
                            <span>{course.title}</span>
                            <div>
                                <button onClick={() => moveCourse(index, 'up')} disabled={index === 0} className="px-2 py-1 text-sm rounded disabled:opacity-50">Up</button>
                                <button onClick={() => moveCourse(index, 'down')} disabled={index === orderedCourses.length - 1} className="px-2 py-1 text-sm rounded disabled:opacity-50">Down</button>
                            </div>
                        </div>
                    ))}
                </div>
                <h3 className="text-lg font-bold mb-4 mt-4">Cursos não ordenados</h3>
                <div className="space-y-2">
                    {unorderedCourses.map((course) => (
                         <div key={course.id} className="flex items-center justify-between bg-black/20 p-2 rounded">
                            <span>{course.title}</span>
                            <button onClick={() => setCourseOrder([...courseOrder, course.id])} className="px-2 py-1 text-sm rounded">Add</button>
                        </div>
                    ))}
                </div>
            </div>
            <div className="flex justify-end mt-6">
                <button
                    onClick={handleSave}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-md transition-colors"
                    disabled={loading}
                >
                    {loading ? 'Salvando...' : 'Salvar Alterações'}
                </button>
            </div>
        </div>
    );
};

export default EditMainPage;