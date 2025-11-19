import React, { useState, useRef, useEffect } from 'react';
import { MoreVerticalIcon, TrashIcon, PencilIcon, InfoIcon, LockClosedIcon as LockIcon, ArrowTopRightOnSquareIcon } from '../Icons';

interface SiteCardProps {
  site: string;
  isConnected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onInstallSsl: () => void;
}

const SiteCard: React.FC<SiteCardProps> = ({ site, isConnected, onSelect, onDelete, onEdit, onInstallSsl }) => {
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
        <div className="flex-grow min-w-0"> {/* Allow shrinking */}
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors truncate">{site}</h3>
            <a href={`https://${site}/wp-admin`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-gray-400 hover:text-white">
                <ArrowTopRightOnSquareIcon className="w-5 h-5" />
            </a>
          </div>
          <div className="flex items-center gap-2 text-sm mt-2">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
            <span className={`${isConnected ? 'text-gray-400' : 'text-yellow-400'}`}>{isConnected ? 'Conectado' : 'Configurar Site'}</span>
          </div>
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
            <div className="absolute right-0 mt-2 w-56 bg-gray-900 border border-gray-700 rounded-md shadow-lg z-10">
              <ul className="py-1">
                <li><a href="#" onClick={(e) => handleAction(onSelect, e)} className="flex items-center px-4 py-2 text-sm text-gray-300 hover:bg-gray-800"><InfoIcon className="w-4 h-4 mr-3" />Ver Detalhes</a></li>
                <li><a href="#" onClick={(e) => handleAction(onInstallSsl, e)} className="flex items-center px-4 py-2 text-sm text-gray-300 hover:bg-gray-800"><LockIcon className="w-4 h-4 mr-3" />Instalar/Reinstalar SSL</a></li>
                <li><a href="#" onClick={(e) => handleAction(onEdit, e)} className="flex items-center px-4 py-2 text-sm text-gray-300 hover:bg-gray-800"><PencilIcon className="w-4 h-4 mr-3" />Editar Site</a></li>
                <li className="border-t border-gray-700 my-1"></li>
                <li><a href="#" onClick={(e) => handleAction(onDelete, e)} className="flex items-center px-4 py-2 text-sm text-red-500 hover:bg-red-900/50"><TrashIcon className="w-4 h-4 mr-3" />Deletar Site</a></li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SiteCard;