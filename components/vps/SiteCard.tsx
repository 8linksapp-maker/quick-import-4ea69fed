import React, { useState, useRef, useEffect } from 'react';
import { MoreVerticalIcon, TrashIcon, PencilIcon, InfoIcon, LockClosedIcon as LockIcon } from '../Icons';

interface SiteCardProps {
  site: string;
  isConnected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onInstallSsl: () => void;
}

const SiteCard: React.FC<SiteCardProps> = ({ site, isConnected, onSelect, onDelete, onEdit, onInstallSsl }) => {
// ...
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
// ...
};

export default SiteCard;
