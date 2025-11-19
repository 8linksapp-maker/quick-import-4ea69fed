import React from 'react';
import { VpsData } from '../VpsCard';
import { PencilIcon, TrashIcon } from '../Icons';

interface VpsListItemProps {
  vps: VpsData;
  onSelect: (vps: VpsData) => void;
  onEdit: (e: React.MouseEvent, vps: VpsData) => void;
  onDelete: (e: React.MouseEvent, vpsId: number) => void;
}

const VpsListItem: React.FC<VpsListItemProps> = ({ vps, onSelect, onEdit, onDelete }) => {
  return (
    <div 
      onClick={() => onSelect(vps)}
      className="flex items-center justify-between p-4 bg-gray-800 rounded-lg mb-3 hover:bg-gray-700/80 transition-colors duration-200 cursor-pointer"
    >
      <div className="flex-grow">
        <p className="font-semibold text-white">{vps.host}</p>
        <p className="text-sm text-gray-400">{vps.ip}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button 
          onClick={(e) => onEdit(e, vps)}
          className="p-2 text-blue-400 rounded-full hover:bg-gray-700 transition-colors"
          title="Editar VPS"
        >
          <PencilIcon className="w-5 h-5" />
        </button>
        <button 
          onClick={(e) => onDelete(e, vps.id)}
          className="p-2 text-red-500 rounded-full hover:bg-gray-700 transition-colors"
          title="Deletar VPS"
        >
          <TrashIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default VpsListItem;
