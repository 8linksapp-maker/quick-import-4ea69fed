import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }

        // Cleanup on unmount
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const modalContent = (
        <div 
            className="fixed inset-0 bg-black bg-opacity-75 z-50 flex justify-center items-center"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
        >
            <div 
                className="bg-[#181818] rounded-lg shadow-xl w-full max-w-2xl m-4"
                onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the modal
            >
                <div className="flex justify-between items-center p-5 border-b border-gray-700">
                    <h3 id="modal-title" className="text-xl font-bold text-white">{title}</h3>
                    <button 
                        onClick={onClose} 
                        className="text-gray-400 hover:text-white text-3xl leading-none font-semibold outline-none focus:outline-none"
                    >
                        &times;
                    </button>
                </div>
                <div className="p-6 pb-6 text-white max-h-[80vh] overflow-y-auto">
                    {children}
                </div>
            </div>
        </div>
    );

    const modalRoot = document.getElementById('modal-root');
    if (!modalRoot) {
        console.error("The element with id 'modal-root' was not found in the DOM.");
        return null;
    }

    return createPortal(modalContent, modalRoot);
};

export default Modal;
