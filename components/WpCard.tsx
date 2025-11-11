
import React from 'react';
import { PencilIcon, TrashIcon } from './Icons';

export interface WpData {
  id: number;
  site_url: string;
  wp_username: string;
  created_at: string;
}

interface WpCardProps {
  wpSite: WpData;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const WpCard: React.FC<WpCardProps> = ({ wpSite, onClick, onEdit, onDelete }) => {
  return (
    <div 
      className="bg-gray-800 border border-gray-700 rounded-lg p-6 group transition-colors flex flex-col justify-between h-full"
    >
      <div onClick={onClick} className="cursor-pointer flex-grow">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors">{wpSite.site_url}</h3>
          <div className="w-3 h-3 bg-green-500 rounded-full" title="Online"></div>
        </div>
        <p className="text-sm text-gray-400">Usuário: {wpSite.wp_username}</p>
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="text-blue-400 hover:text-blue-600 p-1 rounded-full hover:bg-gray-700 transition-colors"><PencilIcon className="w-5 h-5" /></button>
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-gray-700 transition-colors"><TrashIcon className="w-5 h-5" /></button>
      </div>
    </div>
  );
};

export default WpCard;
