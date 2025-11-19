import React from 'react';
import Modal from '../../Modal';

const DeleteWpUserModal = ({ user, onConfirm, onCancel }) => {
    if (!user) return null;
    return (
        <Modal isOpen={true} onClose={onCancel} title="Confirmar Exclusão de Usuário">
            <p className="text-gray-300 mb-4">
                Tem certeza que deseja excluir o usuário <strong>{user.user_login}</strong>? Esta ação é irreversível.
            </p>
            <div className="flex justify-end items-center gap-4 mt-6">
                <button type="button" onClick={onCancel} className="text-gray-400 hover:text-white">Cancelar</button>
                <button 
                    type="button" 
                    onClick={() => onConfirm(user)} 
                    className="bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700"
                >
                    Excluir Usuário
                </button>
            </div>
        </Modal>
    );
};

export default DeleteWpUserModal;
