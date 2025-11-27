import React from 'react';
import { TrashIcon, PencilIcon, LockClosedIcon as LockIcon } from '../Icons';

interface SiteListItemProps {
  site: string;
  isConnected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onInstallSsl: () => void;
}

const SiteListItem: React.FC<SiteListItemProps> = ({ site, isConnected, onSelect, onDelete, onEdit, onInstallSsl }) => {
  const handleAction = (action: () => void, e: React.MouseEvent) => {
    e.stopPropagation();
    action();
  };

  return (
    <div 
      onClick={onSelect}
      className="flex items-center justify-between p-4 bg-gray-800/50 border border-transparent rounded-lg hover:bg-gray-700/60 transition-colors duration-200 cursor-pointer"
    >
      <div className="flex items-center gap-3">
          <span className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-green-400' : 'bg-yellow-400'}`} title={isConnected ? 'Conectado' : 'Requer configuração'}></span>
          <div>
              <p className="font-semibold text-gray-100">{site}</p>
              {!isConnected && (
                <button
                  onClick={(e) => handleAction(onEdit, e)}
                  className="text-xs text-yellow-300 hover:text-yellow-200 hover:underline focus:outline-none font-semibold"
                >
                  Configurar Site
                </button>
              )}
          </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
         <button 
          onClick={(e) => {e.stopPropagation(); onInstallSsl();}}
          className="p-2 rounded-lg text-green-500 hover:bg-gray-700/50 hover:text-green-400 transition-colors"
          title="Instalar/Reinstalar SSL"
        >
          <LockIcon className="w-5 h-5" />
        </button>
        <button 
          onClick={(e) => {e.stopPropagation(); onEdit();}}
          className="p-2 rounded-lg text-blue-500 hover:bg-gray-700/50 hover:text-blue-400 transition-colors"
          title="Editar Site"
        >
          <PencilIcon className="w-5 h-5" />
        </button>
        <button 
          onClick={(e) => {e.stopPropagation(); onDelete();}}
          className="p-2 rounded-lg text-red-500 hover:bg-red-900/40 hover:text-red-400 transition-colors"
          title="Deletar Site"
        >
          <TrashIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default SiteListItem;
