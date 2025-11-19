import React from 'react';
import Modal from '../../Modal';

const WpUsersModal = ({ users, onClose, onAdd, onEdit, onDelete }) => (
    <Modal isOpen={true} onClose={onClose} title="Usuários WordPress">
        <div className="mb-4">
            <button onClick={onAdd} className="bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700">
                Adicionar Novo Usuário
            </button>
        </div>
        <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-sm text-left text-gray-400">
                <thead className="text-xs text-gray-300 uppercase bg-gray-700">
                    <tr>
                        <th scope="col" className="px-6 py-3">ID</th>
                        <th scope="col" className="px-6 py-3">Login</th>
                        <th scope="col" className="px-6 py-3">Email</th>
                        <th scope="col" className="px-6 py-3">Role</th>
                        <th scope="col" className="px-6 py-3">Ações</th>
                    </tr>
                </thead>
                <tbody>
                    {users.map((user) => (
                        <tr key={user.ID} className="bg-gray-800 border-b border-gray-700">
                            <td className="px-6 py-4">{user.ID}</td>
                            <td className="px-6 py-4">{user.user_login}</td>
                            <td className="px-6 py-4">{user.user_email}</td>
                            <td className="px-6 py-4">{user.roles}</td>
                            <td className="px-6 py-4">
                                <button onClick={() => onEdit(user)} className="font-medium text-blue-500 hover:underline mr-4">Editar</button>
                                <button onClick={() => onDelete(user)} className="font-medium text-red-500 hover:underline">Deletar</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
        <div className="flex justify-end mt-4">
            <button onClick={onClose} className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700">
                Fechar
            </button>
        </div>
    </Modal>
);

export default WpUsersModal;
