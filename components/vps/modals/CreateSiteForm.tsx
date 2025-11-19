import React, { useState } from 'react';
import InputField from '../../InputField';

const CreateSiteForm = ({ onSubmit, onCancel }) => {
    const [domain, setDomain] = useState('');
    const [user, setUser] = useState('admin');
    const [pass, setPass] = useState('');
    const [email, setEmail] = useState('');
  
    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      onSubmit({ domain, user, pass, email });
    };
  
    return (
      <form onSubmit={handleSubmit}>
        <InputField label="Domínio" id="domain" type="text" value={domain} onChange={(e) => setDomain(e.target.value)} required />
        <InputField label="Usuário WP" id="user" type="text" value={user} onChange={(e) => setUser(e.target.value)} required />
        <InputField label="Senha WP" id="pass" type="password" value={pass} onChange={(e) => setPass(e.target.value)} required />
        <InputField label="Email WP" id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <div className="flex justify-end items-center gap-4 mt-6">
          <button type="button" onClick={onCancel} className="text-gray-400 hover:text-white">Cancelar</button>
          <button type="submit" className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700">
            Criar Site
          </button>
        </div>
      </form>
    );
};

export default CreateSiteForm;
