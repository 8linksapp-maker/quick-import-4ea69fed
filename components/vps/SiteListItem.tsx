import React from 'react';
import { MoreVerticalIcon, TrashIcon, PencilIcon, InfoIcon } from '../Icons';

interface SiteListItemProps {
  site: string;
  onSelect: () => void;
  onDelete: () => void;
  onEdit: () => void;
}

const SiteListItem: React.FC<SiteListItemProps> = ({ site, onSelect, onDelete, onEdit }) => {
  // O menu dropdown foi movido para o SiteCard, mas podemos ter botões diretos aqui
  return (
    <div 
      onClick={onSelect}
      className="flex items-center justify-between p-4 bg-gray-800 rounded-lg mb-3 hover:bg-gray-700/80 transition-colors duration-200 cursor-pointer"
    >
      <p className="font-semibold text-white flex-grow">{site}</p>
      <div className="flex items-center gap-2 flex-shrink-0">
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
