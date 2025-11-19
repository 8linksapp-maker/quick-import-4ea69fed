import React, { useState, useRef, useEffect } from 'react';
import { MoreVerticalIcon, UsersIcon, LockIcon, Trash2Icon } from '../Icons';

interface SiteListItemProps {
  site: string;
  isJobRunning: boolean;
  onManageUsers: (site: string) => void;
  onInstallSsl: (site: string) => void;
  onDeleteSite: (site: string) => void;
}

const SiteListItem: React.FC<SiteListItemProps> = ({ site, isJobRunning, onManageUsers, onInstallSsl, onDeleteSite }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleAction = (action: (site: string) => void) => {
    setIsMenuOpen(false);
    action(site);
  };

  return (
    <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg mb-3 hover:bg-gray-700 transition-colors duration-200">
      <span className="font-medium text-white">{site}</span>
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          disabled={isJobRunning}
          className="p-2 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50"
        >
          <MoreVerticalIcon className="w-5 h-5 text-white" />
        </button>
        {isMenuOpen && (
          <div className="absolute right-0 mt-2 w-56 bg-gray-900 border border-gray-700 rounded-md shadow-lg z-10">
            <ul className="py-1">
              <li>
                <a
                  href="#"
                  onClick={(e) => { e.preventDefault(); handleAction(onManageUsers); }}
                  className="flex items-center px-4 py-2 text-sm text-gray-300 hover:bg-gray-800"
                >
                  <UsersIcon className="w-4 h-4 mr-3" />
                  Gerenciar Usuários
                </a>
              </li>
              <li>
                <a
                  href="#"
                  onClick={(e) => { e.preventDefault(); handleAction(onInstallSsl); }}
                  className="flex items-center px-4 py-2 text-sm text-gray-300 hover:bg-gray-800"
                >
                  <LockIcon className="w-4 h-4 mr-3" />
                  Instalar/Reinstalar SSL
                </a>
              </li>
              <li className="border-t border-gray-700 my-1"></li>
              <li>
                <a
                  href="#"
                  onClick={(e) => { e.preventDefault(); handleAction(onDeleteSite); }}
                  className="flex items-center px-4 py-2 text-sm text-red-500 hover:bg-red-900/50"
                >
                  <Trash2Icon className="w-4 h-4 mr-3" />
                  Deletar Site
                </a>
              </li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default SiteListItem;
