import React, { useState } from 'react';
import InputField from '../../InputField';

const EditWpUserForm = ({ user, domain, onSubmit, onCancel }) => {
    const [userPass, setUserPass] = useState('');
    const [userRole, setUserRole] = useState(user.roles);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({ domain, userId: user.ID, userLogin: user.user_login, pass: userPass, role: userRole });
    };

    return (
        <form onSubmit={handleSubmit}>
            <p className="mb-4 text-gray-300">Editando usuário: <strong>{user.user_login}</strong></p>
            <InputField label="Nova Senha (deixe em branco para não alterar)" id="user_pass" type="password" value={userPass} onChange={(e) => setUserPass(e.target.value)} />
            <label htmlFor="user_role" className="block text-sm font-medium text-gray-300 mb-2">Role</label>
            <select id="user_role" value={userRole} onChange={(e) => setUserRole(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="administrator">Administrator</option>
                <option value="editor">Editor</option>
                <option value="author">Author</option>
                <option value="contributor">Contributor</option>
                <option value="subscriber">Subscriber</option>
            </select>
            <div className="flex justify-end items-center gap-4 mt-6">
                <button type="button" onClick={onCancel} className="text-gray-400 hover:text-white">Cancelar</button>
                <button type="submit" className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700">
                    Atualizar Usuário
                </button>
            </div>
        </form>
    );
};

export default EditWpUserForm;