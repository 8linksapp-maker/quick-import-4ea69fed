import React from 'react';
import { MoreVerticalIcon, TrashIcon, PencilIcon, InfoIcon } from '../Icons';

interface SiteListItemProps {
  site: string;
  isConnected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onInstallSsl: () => void;
}

const SiteListItem: React.FC<SiteListItemProps> = ({ site, isConnected, onSelect, onDelete, onEdit }) => {
  // O menu dropdown foi movido para o SiteCard, mas podemos ter botões diretos aqui
  return (
    <div 
      onClick={onSelect}
      className="flex items-center justify-between p-4 bg-gray-800 rounded-lg mb-3 hover:bg-gray-700/80 transition-colors duration-200 cursor-pointer"
    >
      <div className="flex items-center gap-3">
          <span className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-green-500' : 'bg-yellow-500'}`} title={isConnected ? 'Conectado' : 'Requer configuração'}></span>
          <div>
              <p className="font-semibold text-white">{site}</p>
              {!isConnected && <p className="text-xs text-yellow-400">Configurar Site</p>}
          </div>
      </div>      <div className="flex items-center gap-2 flex-shrink-0">
         <button 
          onClick={(e) => {e.stopPropagation(); onInstallSsl();}}
          className="p-2 text-yellow-400 rounded-full hover:bg-gray-700 transition-colors"
          title="Instalar/Reinstalar SSL"
        >
          <LockIcon className="w-5 h-5" />
        </button>
         <button 
          onClick={(e) => {e.stopPropagation(); onEdit();}}
          className="p-2 text-blue-400 rounded-full hover:bg-gray-700 transition-colors"
          title="Editar Site"
        >
          <PencilIcon className="w-5 h-5" />
        </button>
        <button 
          onClick={(e) => {e.stopPropagation(); onDelete();}}
          className="p-2 text-red-500 rounded-full hover:bg-gray-700 transition-colors"
          title="Deletar Site"
        >
          <TrashIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default SiteListItem;
