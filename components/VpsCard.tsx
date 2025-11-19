
import React from 'react';
import { PencilIcon, TrashIcon } from './Icons';

export interface VpsData {
  id: number;
  host: string;
  username: string;
  port: number;
  created_at: string;
}

interface VpsCardProps {
  vps: VpsData;
  onEdit: () => void;
  onDelete: () => void;
}

const VpsCard: React.FC<VpsCardProps> = ({ vps, onEdit, onDelete }) => {
  const formatDate = (isoString: string) => {
    if (!isoString) return 'Data desconhecida';
    const date = new Date(isoString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-based
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };
  const formattedDate = formatDate(vps.created_at);

  return (
    <div 
      className="bg-gray-800 border border-gray-700 rounded-lg p-6 group transition-colors flex flex-col justify-between h-full"
    >
      <div className="cursor-pointer flex-grow">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors">{vps.host}</h3>
          <div className="w-3 h-3 bg-green-500 rounded-full" title="Online"></div>
        </div>
        <p className="text-sm text-gray-400">Usuário: {vps.username}</p>
        <p className="text-sm text-gray-400">Porta: {vps.port}</p>
        <p className="text-xs text-gray-500 mt-2">Criado em: {formattedDate}</p>
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="text-blue-400 hover:text-blue-600 p-1 rounded-full hover:bg-gray-700 transition-colors"><PencilIcon className="w-5 h-5" /></button>
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-gray-700 transition-colors"><TrashIcon className="w-5 h-5" /></button>
      </div>
    </div>
  );
};

export default VpsCard;
