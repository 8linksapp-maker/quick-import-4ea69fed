import React, { useState } from 'react';
import { AddIcon } from '../components/Icons';
import Modal from '../components/Modal';
import VpsListTab from '../components/tabs/VpsListTab';
import AddVpsForm from '../components/AddVpsForm';
import { VpsData } from '../components/VpsCard';
import VpsControlPanel from '../components/vps/VpsControlPanel';
import SitesListTab from '../components/tabs/SitesListTab';
import AddWpSiteForm from '../components/AddWpSiteForm';
import WpDetails from '../components/WpDetails';
import { WpData } from '../components/WpCard'; // Assuming WpData is exported from WpCard

const BlogHousePage = () => {
  const [activeTab, setActiveTab] = useState<'vps' | 'sites'>('vps');
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  // Page view state
  const [selectedVps, setSelectedVps] = useState<VpsData | null>(null);
  const [selectedSite, setSelectedSite] = useState<{ domain: string, vps?: VpsData, wpData?: WpData } | null>(null);

  // Modal states
  const [isAddVpsModalOpen, setIsAddVpsModalOpen] = useState(false);
  const [isAddSiteModalOpen, setIsAddSiteModalOpen] = useState(false);

  const handleContentAdded = () => {
    setIsAddVpsModalOpen(false);
    setIsAddSiteModalOpen(false);
    setRefetchTrigger(prev => prev + 1);
  };

  const handleSiteSelect = (siteDomain: string, vps?: VpsData, wpData?: WpData) => {
    setSelectedSite({ domain: siteDomain, vps, wpData });
  };
  
  // Render Site Details Full Screen
  if (selectedSite) {
    // Note: WpDetails expects a full WpData object. 
    // If the site is just 'installed' (from VpsControlPanel), we don't have this.
    // We pass a placeholder or a partially filled object.
    // A better approach would be to fetch details on demand.
    const siteDataForDetails: WpData = selectedSite.wpData || {
        id: 0, // Placeholder ID
        site_url: selectedSite.domain,
        wp_username: 'N/A (Site não conectado)',
        created_at: '',
    };

    return (
        <div className="pt-24 bg-[#141414] min-h-screen text-white">
            <WpDetails site={siteDataForDetails} onBack={() => setSelectedSite(null)} />
        </div>
    );
  }

  // Render VPS Control Panel Full Screen
  if (selectedVps) {
    return (
      <div className="pt-24 bg-[#141414] min-h-screen text-white">
        <VpsControlPanel 
          vps={selectedVps} 
          onBack={() => setSelectedVps(null)} 
          onVpsDeleted={() => { setSelectedVps(null); setRefetchTrigger(prev => prev + 1); }} 
          onSiteSelect={handleSiteSelect}
        />
      </div>
    );
  }

  // Default: Render Tabs View
  return (
    <div className="pt-24 bg-[#141414] min-h-screen text-white px-4 md:px-16 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <h1 className="text-4xl font-bold tracking-tighter mb-4 md:mb-0">Blog House</h1>
        <div className="flex items-center gap-4">
          <button onClick={() => setIsAddVpsModalOpen(true)} className="inline-flex items-center gap-2 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors">
            <AddIcon /> Cadastrar VPS
          </button>
          <button onClick={() => setIsAddSiteModalOpen(true)} className="inline-flex items-center gap-2 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors">
            <AddIcon /> Cadastrar Site WP
          </button>
        </div>
      </div>

      <div className="w-full">
        <div className="flex border-b border-gray-700">
          <button onClick={() => setActiveTab('vps')} className={`py-3 px-6 font-semibold transition-colors ${activeTab === 'vps' ? 'text-white border-b-2 border-blue-500' : 'text-gray-400 hover:text-white'}`}>
            Servidores (VPS)
          </button>
          <button onClick={() => setActiveTab('sites')} className={`py-3 px-6 font-semibold transition-colors ${activeTab === 'sites' ? 'text-white border-b-2 border-blue-500' : 'text-gray-400 hover:text-white'}`}>
            Sites WordPress
          </button>
        </div>
        <div>
          {activeTab === 'vps' && <VpsListTab onVpsSelect={setSelectedVps} refetchTrigger={refetchTrigger} />}
          {activeTab === 'sites' && <SitesListTab onSiteSelect={handleSiteSelect} refetchTrigger={refetchTrigger} />}
        </div>
      </div>

      <Modal isOpen={isAddVpsModalOpen} onClose={() => setIsAddVpsModalOpen(false)} title="Adicionar Novo VPS">
        <AddVpsForm onVpsAdded={handleContentAdded} onCancel={() => setIsAddVpsModalOpen(false)} />
      </Modal>
      <Modal isOpen={isAddSiteModalOpen} onClose={() => setIsAddSiteModalOpen(false)} title="Adicionar Novo Site WordPress">
        <AddWpSiteForm onWpSiteAdded={handleContentAdded} onCancel={() => setIsAddSiteModalOpen(false)} />
      </Modal>
    </div>
  );
};

export default BlogHousePage;
