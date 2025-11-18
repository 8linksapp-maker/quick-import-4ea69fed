import React, { useState, useEffect } from 'react';
import ConfirmModal from '../../components/admin/ConfirmModal';
import Modal from '../../components/Modal';
import InputField from '../../components/InputField';
import { supabase } from '../../src/supabaseClient';

interface User {
    id: string;
    email?: string;
    password?: string;
    user_metadata: {
        name?: string;
        role?: string;
    };
}

const ManageUsersPage: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
    const [isEditModalOpen, setEditModalOpen] = useState(false);
    const [isAddModalOpen, setAddModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [editedUser, setEditedUser] = useState<User | null>(null);
    const [newUser, setNewUser] = useState({ email: '', password: '', name: '', role: 'User' });

    const [courses, setCourses] = useState<any[]>([]);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const { data, error } = await supabase.functions.invoke('get-users');
                if (error) {
                    throw error;
                }
                setUsers(data.users || []);
            } catch (error: any) {
                setError(error.message);
            } finally {
                setLoading(false);
            }
        };

        const fetchCourses = async () => {
            try {
                const { data, error } = await supabase.functions.invoke('get-courses');
                if (error) {
                    throw error;
                }
                setCourses(data.data || []);
            } catch (error: any) {
                console.error('Error fetching courses:', error.message);
            }
        };

        fetchUsers();
        fetchCourses();
    }, []);

    const openDeleteModal = (user: User) => {
        setSelectedUser(user);
        setDeleteModalOpen(true);
    };

    const closeDeleteModal = () => {
        setSelectedUser(null);
        setDeleteModalOpen(false);
    };

    const [userCourses, setUserCourses] = useState<any[]>([]);
    const [expirationDates, setExpirationDates] = useState<{ [key: string]: string }>({});

    const openEditModal = async (user: User) => {
        setSelectedUser(user);
        setEditedUser(user);
        try {
            const [{ data: coursesData, error: coursesError }, { data: subsData, error: subsError }] = await Promise.all([
                supabase.from('user_courses').select('course_id').eq('user_id', user.id),
                supabase.from('subscriptions').select('course_id, end_date').eq('user_id', user.id)
            ]);

            if (coursesError) throw coursesError;
            if (subsError) throw subsError;

            setUserCourses(coursesData.map(c => c.course_id));

            const expDates: { [key: string]: string } = {};
            if (subsData) {
                subsData.forEach(sub => {
                    if (sub.end_date) {
                        expDates[sub.course_id] = new Date(sub.end_date).toISOString().split('T')[0];
                    }
                });
            }
            setExpirationDates(expDates);

        } catch (error: any) {
            console.error('Error fetching user courses/subscriptions:', error.message);
        }
        setEditModalOpen(true);
    };

    const closeEditModal = () => {
        setSelectedUser(null);
        setEditedUser(null);
        setEditModalOpen(false);
    };

    const openAddModal = () => {
        setAddModalOpen(true);
    };

    const closeAddModal = () => {
        setNewUser({ email: '', password: '', name: '', role: 'User' });
        setAddModalOpen(false);
    };

    const handleDeleteUser = async () => {
        if (selectedUser) {
            try {
                const { error } = await supabase.functions.invoke('delete-user', {
                    body: { id: selectedUser.id },
                });
                if (error) {
                    throw error;
                }
                setUsers(users.filter(user => user.id !== selectedUser.id));
                closeDeleteModal();
            } catch (error: any) {
                setError(error.message);
            }
        }
    };

    const handleEditUser = async () => {
        if (editedUser) {
            try {
                const updateData: any = {
                    email: editedUser.email,
                    user_metadata: {
                        name: editedUser.user_metadata.name,
                        role: editedUser.user_metadata.role,
                    }
                };

                if (editedUser.password) {
                    updateData.password = editedUser.password;
                }

                const { data, error } = await supabase.functions.invoke('update-user', {
                    body: { id: editedUser.id, ...updateData },
                });

                if (error) {
                    throw error;
                }

                const expirationDates: { [key: string]: string } = {};
                userCourses.forEach(courseId => {
                    const input = document.getElementById(`course-expiry-${courseId}`) as HTMLInputElement;
                    if (input) {
                        expirationDates[courseId] = input.value;
                    }
                });

                const { error: coursesError } = await supabase.functions.invoke('update-user-courses', {
                    body: { userId: editedUser.id, courseIds: userCourses, expirationDates: expirationDates },
                });

                if (coursesError) {
                    throw coursesError;
                }

                if (data) {
                    setUsers(users.map(u => u.id === data.data.user.id ? data.data.user : u));
                }
                closeEditModal();
            } catch (error: any) {
                setError(error.message);
            }
        }
    };

    const handleAddUser = async () => {
        try {
            const { data, error } = await supabase.functions.invoke('create-user', {
                body: {
                    user: {
                        email: newUser.email,
                        password: newUser.password,
                        email_confirm: true,
                        user_metadata: {
                            name: newUser.name,
                            role: newUser.role,
                        }
                    }
                }
            });
            if (error) {
                throw error;
            }
            if (data) {
                setUsers([...users, data.data.user]);
            }
            closeAddModal();
        } catch (error: any) {
            setError(error.message);
        }
    };

    if (loading) {
        return <div>Loading...</div>;
    }

    if (error) {
        return <div>Error: {error}</div>;
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl md:text-3xl font-bold">Gerenciar Usuários</h2>
                <button onClick={openAddModal} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md transition-colors">Adicionar Usuário</button>
            </div>
            <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-lg shadow-lg overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-white/10">
                        <tr>
                            <th className="p-4 font-semibold">Name</th>
                            <th className="p-4 font-semibold">Email</th>
                            <th className="p-4 font-semibold">Role</th>
                            <th className="p-4 font-semibold text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((user, index) => (
                            <tr key={user.id} className={`border-t border-white/10 ${index % 2 === 0 ? 'bg-transparent' : 'bg-white/5'}`}>
                                <td className="p-4">{user.user_metadata?.name ?? 'No Name'}</td>
                                <td className="p-4">{user.email}</td>
                                <td className="p-4">{user.user_metadata?.role ?? 'No Role'}</td>
                                <td className="p-4 text-right">
                                    <button onClick={() => openEditModal(user)} className="text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors mr-4">Edit</button>
                                    <button onClick={() => openDeleteModal(user)} className="text-sm font-medium text-red-500 hover:text-red-400 transition-colors">Delete</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {isDeleteModalOpen && (
                <ConfirmModal
                    isOpen={isDeleteModalOpen}
                    title="Confirmar Exclusão"
                    message="Você tem certeza que deseja excluir este usuário?"
                    onConfirm={handleDeleteUser}
                    onCancel={closeDeleteModal}
                />
            )}

            {isEditModalOpen && editedUser && (
                <Modal title="Editar Usuário" onClose={closeEditModal} isOpen={isEditModalOpen}>
                    <div className="p-6">
                        <InputField
                            label="Name"
                            value={editedUser.user_metadata.name || ''}
                            onChange={(e) => setEditedUser({ ...editedUser, user_metadata: { ...editedUser.user_metadata, name: e.target.value } })}
                        />
                        <InputField
                            label="Email"
                            type="email"
                            value={editedUser.email || ''}
                            onChange={(e) => setEditedUser({ ...editedUser, email: e.target.value })}
                        />
                        <div className="mb-4">
                            <label className="block text-white text-sm font-bold mb-2" htmlFor="role">
                                Role
                            </label>
                            <select
                                id="role"
                                value={editedUser.user_metadata.role || ''}
                                onChange={(e) => setEditedUser({ ...editedUser, user_metadata: { ...editedUser.user_metadata, role: e.target.value } })}
                                className="shadow appearance-none border border-gray-600 rounded w-full py-2 px-3 bg-gray-800 text-white leading-tight focus:outline-none focus:shadow-outline"
                            >
                                <option value="User">User</option>
                                <option value="Admin">Admin</option>
                            </select>
                        </div>
                        <div className="border-t border-gray-700 pt-6 mt-6">
                            <h3 className="text-lg font-bold mb-4">Gerenciar Cursos</h3>
                            <div className="space-y-4">
                                {courses.map(course => (
                                    <div key={course.id} className="flex items-center justify-between">
                                        <div className="flex items-center">
                                            <input
                                                type="checkbox"
                                                id={`course-${course.id}`}
                                                checked={userCourses.includes(course.id)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setUserCourses([...userCourses, course.id]);
                                                    } else {
                                                        setUserCourses(userCourses.filter(id => id !== course.id));
                                                    }
                                                }}
                                                className="h-4 w-4 text-red-600 bg-gray-800 border-gray-600 rounded focus:ring-red-500"
                                            />
                                            <label htmlFor={`course-${course.id}`} className="ml-2 block text-sm text-gray-300">{course.title}</label>
                                        </div>
                                        {userCourses.includes(course.id) && (
                                            <div className="flex items-center">
                                                <label htmlFor={`course-expiry-${course.id}`} className="mr-2 block text-sm text-gray-300">Expira em:</label>
                                                <input
                                                    type="date"
                                                    id={`course-expiry-${course.id}`}
                                                    defaultValue={expirationDates[course.id] || ''}
                                                    className="w-full bg-black/20 border border-white/20 rounded-md py-1 px-2 text-white"
                                                />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="flex justify-end mt-6">
                            <button onClick={closeEditModal} className="mr-4 px-4 py-2 rounded-md bg-gray-600 hover:bg-gray-700 transition-colors">Cancelar</button>
                            <button onClick={handleEditUser} className="px-4 py-2 rounded-md bg-red-600 hover:bg-red-700 transition-colors">Salvar</button>
                        </div>
                    </div>
                </Modal>
            )}

            {isAddModalOpen && (
                <Modal title="Adicionar Usuário" onClose={closeAddModal} isOpen={isAddModalOpen}>
                    <div className="p-6">
                        <InputField
                            label="Name"
                            value={newUser.name}
                            onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                        />
                        <InputField
                            label="Email"
                            type="email"
                            value={newUser.email}
                            onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                        />
                        <InputField
                            label="Password"
                            type="password"
                            value={newUser.password}
                            onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                        />
                        <div className="mb-4">
                            <label className="block text-white text-sm font-bold mb-2" htmlFor="role">
                                Role
                            </label>
                            <select
                                id="role"
                                value={newUser.role}
                                onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                                className="shadow appearance-none border border-gray-600 rounded w-full py-2 px-3 bg-gray-800 text-white leading-tight focus:outline-none focus:shadow-outline"
                            >
                                <option value="User">User</option>
                                <option value="Admin">Admin</option>
                            </select>
                        </div>
                        <div className="flex justify-end mt-6">
                            <button onClick={closeAddModal} className="mr-4 px-4 py-2 rounded-md bg-gray-600 hover:bg-gray-700 transition-colors">Cancelar</button>
                            <button onClick={handleAddUser} className="px-4 py-2 rounded-md bg-red-600 hover:bg-red-700 transition-colors">Adicionar</button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default ManageUsersPage;