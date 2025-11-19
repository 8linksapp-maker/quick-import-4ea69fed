import React from 'react';
import Modal from '../../Modal';

const OutputModal = ({ output, onClose }) => (
    <Modal isOpen={true} onClose={onClose} title="Resultado do Comando">
        <pre className="bg-black text-white p-4 rounded-md max-h-96 overflow-y-auto text-xs">
            <code>{output}</code>
        </pre>
        <div className="flex justify-end mt-4">
            <button onClick={onClose} className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"> Fechar</button>
        </div>
    </Modal>
);

export default OutputModal;
