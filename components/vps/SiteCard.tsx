import React from 'react';
import { TrashIcon, PencilIcon, LockClosedIcon as LockIcon, ArrowTopRightOnSquareIcon } from '../Icons';

interface SiteCardProps {
  site: string;
  isConnected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onInstallSsl: () => void;
}

const SiteCard: React.FC<SiteCardProps> = ({ site, isConnected, onSelect, onDelete, onEdit, onInstallSsl }) => {
  const handleAction = (action: () => void, e: React.MouseEvent) => {
    e.stopPropagation();
    action();
  };

  return (
    <div
      onClick={onSelect}
      className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/80 rounded-xl p-5 group transition-all duration-300 ease-in-out hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-1 cursor-pointer flex flex-col justify-between h-full"
    >
      {/* Top section for info */}
      <div className="flex-grow">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-gray-100 group-hover:text-white transition-colors truncate">{site}</h3>
                <a href={`https://${site}/wp-admin`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-gray-500 hover:text-blue-400 transition-colors">
                    <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                </a>
            </div>
        </div>
        <div className="flex items-center gap-2 text-xs mt-2">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-yellow-400'}`}></span>
            {isConnected ? (
              <span className="text-gray-400">Conectado</span>
            ) : (
              <button
                onClick={(e) => handleAction(onEdit, e)}
                className="text-yellow-300 hover:text-yellow-200 hover:underline focus:outline-none font-semibold"
              >
                Configurar Site
              </button>
            )}
        </div>
      </div>

      {/* Bottom section for actions */}
      <div className="mt-5 pt-4 flex justify-end items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity duration-300">
        <button
          onClick={(e) => handleAction(onInstallSsl, e)}
          className="p-2 rounded-lg text-green-500 hover:bg-gray-700/50 hover:text-green-400 transition-colors"
          title="Instalar/Reinstalar SSL"
        >
          <LockIcon className="w-5 h-5" />
        </button>
        <button
          onClick={(e) => handleAction(onEdit, e)}
          className="p-2 rounded-lg text-blue-500 hover:bg-gray-700/50 hover:text-blue-400 transition-colors"
          title="Editar Site"
        >
          <PencilIcon className="w-5 h-5" />
        </button>
        <button
          onClick={(e) => handleAction(onDelete, e)}
          className="p-2 rounded-lg text-red-500 hover:bg-red-900/40 hover:text-red-400 transition-colors"
          title="Deletar Site"
        >
          <TrashIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default SiteCard;