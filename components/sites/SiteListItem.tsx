import React from 'react';
import { TrashIcon, LinkIcon, ServerIcon } from '../Icons';
import { WpData } from '../WpCard';

interface CombinedSiteData {
    id: string;
    site_url: string;
    type: 'connected' | 'installed';
    vps_host?: string;
    wpData?: WpData;
}

interface SiteListItemProps {
  site: CombinedSiteData;
  onDelete: (site: CombinedSiteData) => void;
  onEdit: (site: CombinedSiteData) => void;
  onViewDetails: (site: WpData) => void;
}

const SiteListItem: React.FC<SiteListItemProps> = ({ site, onDelete, onEdit, onViewDetails }) => {
  
  const isConnected = site.type === 'connected' && site.wpData;

  const handleMainClick = () => {
    if (isConnected) {
      onViewDetails(site.wpData!);
    } else {
      onEdit(site);
    }
  };

  return (
    <div 
      onClick={handleMainClick}
      className="flex items-center justify-between p-4 bg-gray-800/50 border border-transparent rounded-lg hover:bg-gray-700/60 transition-colors duration-200 cursor-pointer"
    >
      <div className="flex items-center gap-4">
        {isConnected ? <LinkIcon className="w-5 h-5 text-green-400" /> : <ServerIcon className="w-5 h-5 text-blue-400" />}
        <div>
          <p className="font-semibold text-white">{site.site_url}</p>
          {isConnected ? (
            <p className="text-sm text-gray-400">Conectado ao app</p>
          ) : (
            <p className="text-sm text-yellow-300 font-semibold">Clique para configurar a conexão</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button 
          onClick={(e) => { e.stopPropagation(); onDelete(site); }}
          className="p-2 rounded-lg text-red-500 hover:bg-red-900/40 hover:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title={isConnected ? 'Remover do App' : 'Ainda não implementado'}
          disabled={!isConnected}
        >
          <TrashIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default SiteListItem;
