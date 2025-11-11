
import React, { useState, useEffect } from 'react';
import { supabase } from '../src/supabaseClient';
import InputField from '../components/InputField';
import WpCard, { WpData } from '../components/WpCard';
import WpDetails from '../components/WpDetails';
import EditWpSiteForm from '../components/EditWpSiteForm';
import Modal from '../components/Modal';
import { AddIcon as PlusIcon, SearchIcon } from '../components/Icons';

// Form for adding a new WordPress site (inside a modal)
const AddWpSiteForm = ({ onWpSiteAdded, onCancel }) => {
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

// Main Page Component
const ManageWordPressPage = () => {
  const [view, setView] = useState('list');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [siteToEdit, setSiteToEdit] = useState<WpData | null>(null);
  const [wpSites, setWpSites] = useState<WpData[]>([]);
  const [selectedSite, setSelectedSite] = useState<WpData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchWpSites = async () => {
    setLoading(true);
    setError('');
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('get-wp-sites');
      if (invokeError) throw invokeError;
      if (data.error) throw new Error(data.error);
      setWpSites(data.sites || []);
    } catch (err: any) {
      setError(err.message || 'Falha ao buscar a lista de sites WordPress.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchWpSites(); }, []);

  const handleWpSiteAdded = () => { fetchWpSites(); setIsAddModalOpen(false); };

  const handleWpSiteUpdated = () => { fetchWpSites(); setIsEditModalOpen(false); };

  const handleEditSite = (site) => {
    setSiteToEdit(site);
    setIsEditModalOpen(true);
  };

  const handleDeleteSite = async (siteId) => {
    if (window.confirm('Tem certeza que deseja deletar este site?')) {
      try {
        const { error } = await supabase.functions.invoke('delete-wp-site', { body: { siteId } });
        if (error) throw error;
        fetchWpSites();
      } catch (err: any) {
        setError(err.message || 'Falha ao deletar o site.');
      }
    }
  };

  const filteredWpSites = wpSites.filter(site => site.site_url.toLowerCase().includes(searchTerm.toLowerCase()));

  const renderListView = () => {
    if (loading) return <p className="text-center">Carregando seus sites WordPress...</p>;
    if (error) return <p className="text-center text-red-500">{error}</p>;
    return (
      <div className="px-4 md:px-16 py-8">
        <div className="flex justify-between items-center mb-8"><h1 className="text-4xl font-bold tracking-tighter">Gerenciar Sites WordPress</h1></div>
        <div className="relative mb-8">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><SearchIcon /></div>
            <input type="text" placeholder="Procurar por URL do site..." className="w-full bg-gray-900 border border-gray-700 rounded-md py-3 pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <div className="bg-gray-800/50 border-2 border-dashed border-gray-600 rounded-lg flex flex-col items-center justify-center p-6 cursor-pointer hover:bg-gray-800 hover:border-gray-500 transition-colors h-full min-h-[200px]" onClick={() => setIsAddModalOpen(true)}>
            <PlusIcon />
            <h3 className="text-lg font-semibold text-white mt-4">Adicionar Novo Site</h3>
            <p className="text-sm text-gray-500">Conectar um novo site WordPress</p>
          </div>
          {filteredWpSites.map(site => <WpCard key={site.id} wpSite={site} onClick={() => { setSelectedSite(site); setView('details'); }} onDelete={() => handleDeleteSite(site.id)} onEdit={() => handleEditSite(site)} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="pt-24 bg-[#141414] min-h-screen text-white">
      {view === 'list' && renderListView()}
      {view === 'details' && selectedSite && <div className="px-4 md:px-16 py-8"><WpDetails site={selectedSite} onBack={() => setView('list')} /></div>}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Adicionar Novo Site WordPress"><AddWpSiteForm onWpSiteAdded={handleWpSiteAdded} onCancel={() => setIsAddModalOpen(false)} /></Modal>
      {siteToEdit && <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Editar Site WordPress"><EditWpSiteForm site={siteToEdit} onWpSiteUpdated={handleWpSiteUpdated} onCancel={() => setIsEditModalOpen(false)} /></Modal>}
    </div>
  );
};

export default ManageWordPressPage;
