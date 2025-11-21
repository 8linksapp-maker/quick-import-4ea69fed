import React, { useState } from 'react';
import Modal from '../../Modal';
import InputField from '../../InputField';

interface DeleteVpsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  vpsHost: string;
}

const DeleteVpsModal: React.FC<DeleteVpsModalProps> = ({ isOpen, onClose, onConfirm, vpsHost }) => {
    const [confirmationText, setConfirmationText] = useState('');
    const isConfirmed = confirmationText === 'EXCLUIR';

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Confirmar Exclusão da VPS">
            <p className="text-gray-300 mb-4">
              Esta ação é irreversível. As credenciais da VPS <strong className="text-yellow-400">{vpsHost}</strong> serão permanentemente removidas.
            </p>
            <p className="text-gray-300 mb-4">Para confirmar, digite <strong>EXCLUIR</strong> no campo abaixo.</p>
            <InputField
                id="delete-confirm"
                type="text"
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                placeholder="EXCLUIR"
            />
            <div className="flex justify-end items-center gap-4 mt-6">
                <button type="button" onClick={onClose} className="text-gray-400 hover:text-white">Cancelar</button>
                <button 
                    type="button" 
                    onClick={onConfirm} 
                    disabled={!isConfirmed} 
                    className="bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 disabled:bg-gray-500 disabled:cursor-not-allowed"
                >
                    Excluir Permanentemente
                </button>
            </div>
        </Modal>
    );
};

export default DeleteVpsModal;
