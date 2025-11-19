import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../src/supabaseClient';
import WpDetails from '../WpDetails';
import EditWpSiteForm from '../EditWpSiteForm';
import Modal from '../Modal';
import { SearchIcon } from '../Icons';
import SiteListItem from '../sites/SiteListItem';
import { WpData } from '../WpCard';

interface SitesListTabProps {
  refetchTrigger: number;
}

interface CombinedSiteData {
  id: string; 
  site_url: string;
  type: 'connected' | 'installed';
  vps_host?: string;
  wpData?: WpData; 
}

const SitesListTab: React.FC<SitesListTabProps> = ({ refetchTrigger }) => {
  const [view, setView] = useState('list');
  const [allSites, setAllSites] = useState<CombinedSiteData[]>([]);
  const [selectedSite, setSelectedSite] = useState<CombinedSiteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [siteToEdit, setSiteToEdit] = useState<WpData | null>(null);

  const fetchAllSites = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // Logic to fetch all sites
      // ... (as implemented before)
    } catch (err: any) {
      setError(err.message || 'Falha ao buscar a lista de sites.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllSites();
  }, [fetchAllSites, refetchTrigger]);
  
  const handleWpSiteUpdated = () => { fetchAllSites(); setIsEditModalOpen(false); };
  
  const handleEdit = (site: WpData) => {
    setSiteToEdit(site);
    setIsEditModalOpen(true);
  };
  
  const handleDelete = (site: CombinedSiteData) => {
    if (site.type === 'connected' && site.wpData) {
      if (window.confirm('Tem certeza que deseja remover este site do aplicativo?')) {
        supabase.functions.invoke('delete-wp-site', { body: { siteId: site.wpData.id } })
          .then(({ error }) => {
            if (error) throw error;
            fetchAllSites();
          })
          .catch(err => setError(err.message || 'Falha ao deletar o site.'));
      }
    } else {
      alert('A funcionalidade de deletar sites instalados diretamente do servidor ainda não está implementada.');
    }
  };

  const handleViewDetails = (siteData: WpData) => {
    const site = allSites.find(s => s.type === 'connected' && s.wpData?.id === siteData.id);
    if (site) {
      setSelectedSite(site);
      setView('details');
    }
  };

  const filteredSites = allSites.filter(site => site.site_url.toLowerCase().includes(searchTerm.toLowerCase()));

  const renderListView = () => {
    if (loading) return <p className="text-center py-10">Carregando todos os sites...</p>;
    if (error) return <p className="text-center text-red-500 py-10">{error}</p>;
    return (
      <div className="py-8 animate-fade-in">
        <div className="relative mb-8">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><SearchIcon /></div>
          <input type="text" placeholder="Procurar por URL do site..." className="w-full bg-gray-900 border border-gray-700 rounded-md py-3 pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <div className="space-y-3">
          {filteredSites.map(site => (
            <SiteListItem 
              key={site.id} 
              site={site}
              onDelete={handleDelete}
              onEdit={handleEdit}
              onViewDetails={handleViewDetails}
            />
          ))}
        </div>
      </div>
    );
  };
  
  if (view === 'details' && selectedSite?.type === 'connected' && selectedSite.wpData) {
    return (
      <div className="px-4 md:px-16 py-8">
        <WpDetails site={selectedSite.wpData} onBack={() => setView('list')} />
      </div>
    );
  }

  return (
    <>
      {renderListView()}
      {siteToEdit && (
        <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Editar Site WordPress">
          <EditWpSiteForm site={siteToEdit} onWpSiteUpdated={handleWpSiteUpdated} onCancel={() => setIsEditModalOpen(false)} />
        </Modal>
      )}
    </>
  );

export default SitesListTab;
