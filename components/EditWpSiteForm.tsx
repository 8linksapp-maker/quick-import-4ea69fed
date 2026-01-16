import React, { useState, useEffect } from 'react';
import { supabase } from '../src/supabaseClient';
import InputField from './InputField';

const EditWpSiteForm = ({ site, onWpSiteUpdated, onCancel }) => {
  const [siteUrl, setSiteUrl] = useState(site.site_url);
  const [wpUsername, setWpUsername] = useState(site.wp_username);
  const [applicationPassword, setApplicationPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleUpdateSite = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('update-wp-site', {
        body: { siteId: site.id, site_url: siteUrl, wp_username: wpUsername, application_password: applicationPassword },
      });
      if (invokeError) throw invokeError;
      if (data.error) throw new Error(data.error);
      setMessage(data.message || 'Site WordPress atualizado com sucesso!');
      setTimeout(() => onWpSiteUpdated(), 1500);
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro inesperado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleUpdateSite}>
      <InputField label="URL do Site" id="siteUrl" type="text" value={siteUrl} onChange={(e) => setSiteUrl(e.target.value)} required />
      <InputField label="Usuário do WordPress" id="wpUsername" type="text" value={wpUsername} onChange={(e) => setWpUsername(e.target.value)} required />
      
      <div className="bg-yellow-900/20 border border-yellow-600/30 p-3 rounded mb-4 text-sm text-yellow-200/90">
          <p className="mb-2"><strong>Atenção:</strong> Se for alterar a senha, não utilize sua senha de login normal.</p>
          <p className="mb-2">Você precisa criar uma <strong>Senha de Aplicação</strong> no seu WordPress.</p>
          <a 
            href="https://wordpress.com/support/security/two-step-authentication/application-specific-passwords/#site-specific-application-passwords" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center text-blue-400 hover:text-blue-300 hover:underline"
          >
            Ver tutorial de como criar &rarr;
          </a>
      </div>

      <InputField label="Nova Senha da Aplicação (deixe em branco para não alterar)" id="applicationPassword" type="password" value={applicationPassword} onChange={(e) => setApplicationPassword(e.target.value)} />
      <div className="flex justify-end items-center gap-4 mt-6">
        <button type="button" onClick={onCancel} className="text-gray-400 hover:text-white">Cancelar</button>
        <button type="submit" disabled={loading} className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-500">
          {loading ? 'Testando e Salvando...' : 'Salvar Alterações'}
        </button>
      </div>
      {message && <p className="mt-4 text-green-500 text-center">{message}</p>}
      {error && <p className="mt-4 text-red-500 text-center">{error}</p>}
    </form>
  );
};

export default EditWpSiteForm;
