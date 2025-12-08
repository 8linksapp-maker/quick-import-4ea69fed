import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../src/supabaseClient';
import Modal from '../../components/Modal';
import CourseEditor, { Course } from '../../components/admin/CourseEditor';
import useDocumentTitle from '../../src/hooks/useDocumentTitle';

const ManageCoursesPage: React.FC = () => {
    useDocumentTitle('Admin: Gerenciar Cursos');
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isEditorModalOpen, setIsEditorModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    
    const [courseToEdit, setCourseToEdit] = useState<Course | null>(null);
    const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);

    const fetchCourses = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.functions.invoke('get-courses');
            if (error) throw error;
            setCourses(data.data as Course[]);
        } catch (error: any) {
            setError(error.message);
            setCourses([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCourses();
    }, []);

    const handleAddClick = () => {
        setCourseToEdit(null);
        setIsEditorModalOpen(true);
    };

    const handleEditClick = (course: Course) => {
        setCourseToEdit(course);
        setIsEditorModalOpen(true);
    };

    const handleDeleteClick = (course: Course) => {
        setCourseToDelete(course);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!courseToDelete) return;
        
        try {
            const { error } = await supabase.functions.invoke('delete-course', {
                body: { id: courseToDelete.id },
            });
            if (error) throw error;
            await fetchCourses();
        } catch (error: any) {
            setError(error.message);
        }
        setIsDeleteModalOpen(false);
        setCourseToDelete(null);
    };

    const handleCloseEditorModal = () => {
        setIsEditorModalOpen(false);
        setCourseToEdit(null);
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl md:text-3xl font-bold">Gerenciar Cursos</h2>
                <button 
                    onClick={handleAddClick}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md transition-colors"
                >
                    Adicionar Curso
                </button>
            </div>

            {/* Editor Modal */}
            <Modal 
                isOpen={isEditorModalOpen} 
                onClose={handleCloseEditorModal} 
                title={courseToEdit ? "Editar Detalhes do Curso" : "Adicionar Novo Curso"}
            >
                <CourseEditor 
                    onClose={handleCloseEditorModal}
                    onCourseSaved={fetchCourses}
                    courseToEdit={courseToEdit}
                />
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal 
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                title="Confirmar Exclusão"
            >
                <div>
                    <p>Você tem certeza que deseja excluir o curso "{courseToDelete?.title}"?</p>
                    <p className="text-sm text-red-400 mt-2">Atenção: Todos os módulos e aulas associados a este curso também serão permanentemente excluídos.</p>
                    <div className="flex justify-end mt-6">
                        <button onClick={() => setIsDeleteModalOpen(false)} className="mr-4 bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded-md">
                            Cancelar
                        </button>
                        <button onClick={confirmDelete} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-md">
                            Sim, Excluir
                        </button>
                    </div>
                </div>
            </Modal>

            <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-lg shadow-lg overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-white/10">
                        <tr>
                            <th className="p-4 font-semibold">Pôster</th>
                            <th className="p-4 font-semibold">Título</th>
                            <th className="p-4 font-semibold">Instrutor</th>
                            <th className="p-4 font-semibold">Categoria</th>
                            <th className="p-4 font-semibold text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={5} className="text-center p-8">Carregando...</td></tr>
                        ) : error ? (
                            <tr><td colSpan={5} className="text-center p-8 text-red-500">{error}</td></tr>
                        ) : courses.length === 0 ? (
                            <tr><td colSpan={5} className="text-center p-8">Nenhum curso encontrado.</td></tr>
                        ) : (
                            courses.map((course) => (
                                <tr key={course.id} className={`border-t border-white/10`}>
                                    <td className="p-2">
                                        <img src={course.poster_url || ''} alt={course.title} className="w-24 h-12 object-cover rounded-md" />
                                    </td>
                                    <td className="p-4 font-medium">{course.title}</td>
                                    <td className="p-4 text-gray-300">{course.instructor}</td>
                                    <td className="p-4 text-gray-300">{course.category}</td>
                                    <td className="p-4 text-right space-x-2">
                                        <Link to={`/admin/editor/curso/${course.id}`} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-3 rounded-md text-xs">
                                            Conteúdo
                                        </Link>
                                        <button onClick={() => handleEditClick(course)} className="text-sm font-medium text-blue-400 hover:text-blue-300">
                                            Detalhes
                                        </button>
                                        <button onClick={() => handleDeleteClick(course)} className="text-sm font-medium text-red-500 hover:text-red-400">
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ManageCoursesPage;