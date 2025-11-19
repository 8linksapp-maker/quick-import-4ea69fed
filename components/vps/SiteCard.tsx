import React from 'react';
import { MoreVerticalIcon } from '../Icons';

interface SiteCardProps {
  site: string;
  onSelect: () => void;
  // We can add more actions later if needed
}

const SiteCard: React.FC<SiteCardProps> = ({ site, onSelect }) => {
  return (
    <div 
      onClick={onSelect}
      className="bg-gray-800 border border-gray-700 rounded-lg p-6 group transition-all duration-300 hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/10 cursor-pointer flex flex-col justify-between h-full"
    >
      <div>
        <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors truncate">{site}</h3>
        <p className="text-sm text-gray-400 mt-2">Site WordPress</p>
      </div>
      <div className="flex justify-end mt-4">
        <a 
          href={`https://${site}/wp-admin`} 
          target="_blank" 
          rel="noopener noreferrer" 
          onClick={(e) => e.stopPropagation()}
          className="text-sm text-gray-300 hover:text-white hover:underline"
        >
          Painel WP &rarr;
        </a>
      </div>
    </div>
  );
};

export default SiteCard;
