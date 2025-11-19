import React, { useState, useRef, useEffect } from 'react';
import { MoreVerticalIcon, TrashIcon, PencilIcon, InfoIcon } from '../Icons';

interface SiteCardProps {
  site: string;
  onSelect: () => void;
  onDelete: () => void;
  onEdit: () => void;
}

const SiteCard: React.FC<SiteCardProps> = ({ site, onSelect, onDelete, onEdit }) => {
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

  const handleAction = (action: () => void, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMenuOpen(false);
    action();
  };

  return (
    <div 
      onClick={onSelect}
      className="bg-gray-800 border border-gray-700 rounded-lg p-6 group transition-all duration-300 hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/10 cursor-pointer flex flex-col justify-between h-full"
    >
      <div className="flex justify-between items-start">
        <div className="flex-grow">
          <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors truncate pr-4">{site}</h3>
          <p className="text-sm text-gray-400 mt-2">Site WordPress</p>
        </div>
        <div className="relative flex-shrink-0" ref={menuRef}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsMenuOpen(!isMenuOpen);
            }}
            className="p-2 rounded-full hover:bg-gray-700 transition-colors"
          >
            <MoreVerticalIcon className="w-5 h-5 text-gray-400" />
          </button>
          {isMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-gray-900 border border-gray-700 rounded-md shadow-lg z-10">
              <ul className="py-1">
                <li><a href="#" onClick={(e) => handleAction(onSelect, e)} className="flex items-center px-4 py-2 text-sm text-gray-300 hover:bg-gray-800"><InfoIcon className="w-4 h-4 mr-3" />Ver Detalhes</a></li>
                <li><a href="#" onClick={(e) => handleAction(onEdit, e)} className="flex items-center px-4 py-2 text-sm text-gray-300 hover:bg-gray-800"><PencilIcon className="w-4 h-4 mr-3" />Editar Site</a></li>
                <li className="border-t border-gray-700 my-1"></li>
                <li><a href="#" onClick={(e) => handleAction(onDelete, e)} className="flex items-center px-4 py-2 text-sm text-red-500 hover:bg-red-900/50"><TrashIcon className="w-4 h-4 mr-3" />Deletar Site</a></li>
              </ul>
            </div>
          )}
        </div>
      </div>
      <div className="flex justify-end mt-4">
        <a href={`https://${site}/wp-admin`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-sm text-gray-300 hover:text-white hover:underline">
          Painel WP &rarr;
        </a>
      </div>
    </div>
  );
};

export default SiteCard;
