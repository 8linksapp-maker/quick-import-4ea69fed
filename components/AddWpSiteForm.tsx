import React, { useState } from 'react';
import { supabase } from '../src/supabaseClient';
import InputField from './InputField';

interface AddWpSiteFormProps {
  onWpSiteAdded: () => void;
  onCancel: () => void;
}

const AddWpSiteForm: React.FC<AddWpSiteFormProps> = ({ onWpSiteAdded, onCancel }) => {
  const [siteUrl, setSiteUrl] = useState('');
  const [wpUsername, setWpUsername] = useState('');
  const [applicationPassword, setApplicationPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSaveSite = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('save-wp-site', {
        body: { site_url: siteUrl, wp_username: wpUsername, application_password: applicationPassword },
      });
      if (invokeError) throw invokeError;
      if (data.error) throw new Error(data.error);
      setMessage(data.message || 'Site WordPress salvo com sucesso!');
      setTimeout(() => onWpSiteAdded(), 1500);
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro inesperado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSaveSite}>
      <InputField label="URL do Site" id="siteUrl" type="text" value={siteUrl} onChange={(e) => setSiteUrl(e.target.value)} required />
      <InputField label="Usuário do WordPress" id="wpUsername" type="text" value={wpUsername} onChange={(e) => setWpUsername(e.target.value)} required />
      
      <div className="bg-yellow-900/20 border border-yellow-600/30 p-3 rounded mb-4 text-sm text-yellow-200/90">
          <p className="mb-2"><strong>Atenção:</strong> Não utilize sua senha de login normal.</p>
          <p className="mb-2">Para conectar, você precisa criar uma <strong>Senha de Aplicação</strong> no seu WordPress.</p>
          <a 
            href="https://wordpress.com/support/security/two-step-authentication/application-specific-passwords/#site-specific-application-passwords" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center text-blue-400 hover:text-blue-300 hover:underline"
          >
            Ver tutorial de como criar &rarr;
          </a>
      </div>

      <InputField label="Senha da Aplicação" id="applicationPassword" type="password" value={applicationPassword} onChange={(e) => setApplicationPassword(e.target.value)} required />
      <div className="flex justify-end items-center gap-4 mt-6">
        <button type="button" onClick={onCancel} className="text-gray-400 hover:text-white">Cancelar</button>
        <button type="submit" disabled={loading} className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-500">
          {loading ? 'Testando e Salvando...' : 'Salvar Site'}
        </button>
      </div>
      {message && <p className="mt-4 text-green-500 text-center">{message}</p>}
      {error && <p className="mt-4 text-red-500 text-center">{error}</p>}
    </form>
  );
};

export default AddWpSiteForm;
