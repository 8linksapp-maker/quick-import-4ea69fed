import React, { useState } from 'react';
import InputField from '../../InputField';

const AddWpUserForm = ({ domain, onSubmit, onCancel }) => {
    const [userLogin, setUserLogin] = useState('');
    const [userPass, setUserPass] = useState('');
    const [userEmail, setUserEmail] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({ domain, username: userLogin, pass: userPass, email: userEmail, role: 'subscriber' });
    };

    return (
        <form onSubmit={handleSubmit}>
            <InputField label="Username" id="user_login" type="text" value={userLogin} onChange={(e) => setUserLogin(e.target.value)} required />
            <InputField label="Password" id="user_pass" type="password" value={userPass} onChange={(e) => setUserPass(e.target.value)} required />
            <InputField label="Email" id="user_email" type="email" value={userEmail} onChange={(e) => setUserEmail(e.target.value)} required />
            <div className="flex justify-end items-center gap-4 mt-6">
                <button type="button" onClick={onCancel} className="text-gray-400 hover:text-white">Cancelar</button>
                <button type="submit" className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700">
                    Adicionar Usuário
                </button>
            </div>
        </form>
    );
};

export default AddWpUserForm;
