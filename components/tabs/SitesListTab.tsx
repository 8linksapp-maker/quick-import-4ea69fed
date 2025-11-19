import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../src/supabaseClient';
import WpDetails from '../WpDetails';
import EditWpSiteForm from '../EditWpSiteForm';
import Modal from '../Modal';
import { SearchIcon } from '../Icons';
import SiteListItem from '../sites/SiteListItem';
import { WpData } from '../WpCard';

// ... (interfaces remain the same)

const SitesListTab: React.FC<SitesListTabProps> = ({ refetchTrigger }) => {
  // ... (states remain the same)

  // ... (fetchAllSites remains the same)

  useEffect(() => {
    fetchAllSites();
  }, [fetchAllSites, refetchTrigger]);
  
  const handleWpSiteUpdated = () => { fetchAllSites(); setIsEditModalOpen(false); };
  
  const handleEdit = (site: WpData) => {
    setSiteToEdit(site);
    setIsEditModalOpen(true);
  };
  
  const handleDelete = (site: CombinedSiteData) => {
    if (site.type === 'connected') {
      if (window.confirm('Tem certeza que deseja remover este site do aplicativo?')) {
        // ... (delete logic for connected)
      }
    } else {
      alert('A funcionalidade de deletar sites instalados diretamente do servidor ainda não está implementada.');
    }
  };

  const handleViewDetails = (siteData: WpData) => {
    // This requires finding the 'CombinedSiteData' to set the selectedSite
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
  }
  
  // ... (details view and modal rendering remain the same)
};

export default SitesListTab;
