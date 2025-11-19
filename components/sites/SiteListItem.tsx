import React, { useState, useRef, useEffect } from 'react';
import { MoreVerticalIcon, UsersIcon, LockClosedIcon as LockIcon, TrashIcon, InfoIcon, PencilIcon, LinkIcon, ServerIcon } from '../Icons';
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
  onEdit: (site: WpData) => void;
  onViewDetails: (site: WpData) => void;
}

const SiteListItem: React.FC<SiteListItemProps> = ({ site, onDelete, onEdit, onViewDetails }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAction = (action: () => void) => {
    setIsMenuOpen(false);
    action();
  };

  const isConnected = site.type === 'connected' && site.wpData;

  return (
    <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg mb-3 hover:bg-gray-700/80 transition-colors duration-200">
      <div className="flex items-center gap-4">
        {isConnected ? <LinkIcon className="w-5 h-5 text-green-400" /> : <ServerIcon className="w-5 h-5 text-blue-400" />}
        <div>
          <a href={`https://${site.site_url}`} target="_blank" rel="noopener noreferrer" className="font-semibold text-white hover:underline">{site.site_url}</a>
          <p className="text-sm text-gray-400">
            {isConnected ? 'Conectado ao app' : `Instalado em ${site.vps_host}`}
          </p>
        </div>
      </div>
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="p-2 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
        >
          <MoreVerticalIcon className="w-5 h-5 text-white" />
        </button>
        {isMenuOpen && (
          <div className="absolute right-0 mt-2 w-56 bg-gray-900 border border-gray-700 rounded-md shadow-lg z-10">
            <ul className="py-1">
              {isConnected && (
                <>
                  <li>
                    <a href="#" onClick={(e) => { e.preventDefault(); handleAction(() => onViewDetails(site.wpData!)); }} className="flex items-center px-4 py-2 text-sm text-gray-300 hover:bg-gray-800">
                      <InfoIcon className="w-4 h-4 mr-3" /> Ver Detalhes
                    </a>
                  </li>
                  <li>
                    <a href="#" onClick={(e) => { e.preventDefault(); handleAction(() => onEdit(site.wpData!)); }} className="flex items-center px-4 py-2 text-sm text-gray-300 hover:bg-gray-800">
                      <PencilIcon className="w-4 h-4 mr-3" /> Editar Conexão
                    </a>
                  </li>
                </>
              )}
               <li className="border-t border-gray-700 my-1"></li>
              <li>
                <a href="#" onClick={(e) => { e.preventDefault(); handleAction(() => onDelete(site)); }} className="flex items-center px-4 py-2 text-sm text-red-500 hover:bg-red-900/50">
                  <TrashIcon className="w-4 h-4 mr-3" /> 
                  {isConnected ? 'Remover do App' : 'Deletar do Servidor (Em Breve)'}
                </a>
              </li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default SiteListItem;
