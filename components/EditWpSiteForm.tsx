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
