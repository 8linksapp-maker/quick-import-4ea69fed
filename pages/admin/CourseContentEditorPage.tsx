import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../src/supabaseClient';
import { Course } from '../../components/admin/CourseEditor';
import CourseStructureNav from '../../components/admin/CourseStructureNav';
import AddModuleForm from '../../components/admin/forms/AddModuleForm';
import EditModuleForm from '../../components/admin/forms/EditModuleForm';
import AddLessonForm from '../../components/admin/forms/AddLessonForm';
import EditLessonForm from '../../components/admin/forms/EditLessonForm';
import useDocumentTitle from '../../src/hooks/useDocumentTitle';

const CourseContentEditorPage: React.FC = () => {
    const { courseId } = useParams<{ courseId: string }>();
    const [course, setCourse] = useState<Course | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshNav, setRefreshNav] = useState(false); // State to trigger nav refresh

    const [editingView, setEditingView] = useState<{
        type: 'module' | 'lesson';
        action: 'add' | 'edit';
        id?: number;
    } | null>(null);

    useDocumentTitle(course ? `Admin: Editando ${course.title}` : 'Editor de Conteúdo');

    useEffect(() => {
        const fetchCourse = async () => {
            if (!courseId) return;
            setLoading(true);
            const { data, error } = await supabase.from('courses').select('*').eq('id', courseId).single();
            if (error) {
                setError('Curso não encontrado.');
            } else {
                setCourse(data);
            }
            setLoading(false);
        };
        fetchCourse();
    }, [courseId]);

    const handleSelectItem = (type: 'module' | 'lesson', id: number) => {
        setEditingView({ type, action: 'edit', id });
    };

    const handleShowAddForm = (type: 'module' | 'lesson', parentId?: number) => {
        setEditingView({ type, action: 'add', id: parentId });
    };

    const handleContentUpdate = () => {
        setRefreshNav(prev => !prev);
        setEditingView(null);
    }

    const renderEditor = () => {
        if (!editingView) {
            return <p className="text-gray-400">Selecione um item à esquerda para editar, ou adicione um novo item.</p>;
        }

        const { type, action, id } = editingView;

        if (type === 'module') {
            if (action === 'add') {
                return <AddModuleForm courseId={course!.id} onModuleAdded={handleContentUpdate} onCancel={() => setEditingView(null)} />;
            }
            if (action === 'edit' && id) {
                return <EditModuleForm moduleId={id} onModuleUpdated={handleContentUpdate} onCancel={() => setEditingView(null)} />;
            }
        }

        if (type === 'lesson') {
            if (action === 'add' && id) { // Here, id is the moduleId
                return <AddLessonForm moduleId={id} onLessonAdded={handleContentUpdate} onCancel={() => setEditingView(null)} />;
            }
            if (action === 'edit' && id) {
                return <EditLessonForm lessonId={id} onLessonUpdated={handleContentUpdate} onCancel={() => setEditingView(null)} />;
            }
        }

        return null;
    };

    if (loading) return <div className="text-center p-8">Carregando...</div>;
    if (error) return <div className="text-center p-8 text-red-500">{error}</div>;
    if (!course) return <div className="text-center p-8">Curso não encontrado.</div>;

    return (
        <div>
            <div className="mb-8">
                <Link to="/admin/manage-courses" className="text-blue-400 hover:underline mb-4 block">&larr; Voltar para Todos os Cursos</Link>
                <h2 className="text-3xl font-bold">{course.title}</h2>
                <p className="text-lg text-gray-400">Editor de Conteúdo</p>
            </div>

            <div className="flex flex-col md:flex-row gap-8">
                <div className="md:w-1/3 bg-white/5 backdrop-blur-lg border border-white/10 rounded-lg p-4">
                    <h3 className="text-xl font-bold mb-4">Estrutura do Curso</h3>
                    <CourseStructureNav 
                        courseId={course.id}
                        onSelectItem={handleSelectItem}
                        onShowAddForm={handleShowAddForm}
                        refreshKey={refreshNav}
                    />
                </div>

                <div className="md:w-2/3 bg-white/5 backdrop-blur-lg border border-white/10 rounded-lg p-6">
                    {renderEditor()}
                </div>
            </div>
        </div>
    );
};

export default CourseContentEditorPage;
