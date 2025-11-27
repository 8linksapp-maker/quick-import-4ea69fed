import React from 'react';
import { UsersIcon, LockClosedIcon, TrashIcon } from '../Icons';

interface SiteListItemProps {
  site: string;
  isJobRunning: boolean;
  onManageUsers: (site: string) => void;
  onInstallSsl: (site: string) => void;
  onDeleteSite: (site: string) => void;
}

const SiteListItem: React.FC<SiteListItemProps> = ({ site, isJobRunning, onManageUsers, onInstallSsl, onDeleteSite }) => {
  return (
    <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg mb-3">
      <span className="font-medium text-white">{site}</span>
      <div className="flex items-center space-x-2">
        <button
          onClick={() => onManageUsers(site)}
          disabled={isJobRunning}
          className="flex items-center px-3 py-2 text-sm text-gray-300 bg-gray-700 rounded-md hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <UsersIcon className="w-4 h-4 mr-2" />
          Usuários
        </button>
        <button
          onClick={() => onInstallSsl(site)}
          disabled={isJobRunning}
          className="flex items-center px-3 py-2 text-sm text-gray-300 bg-gray-700 rounded-md hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <LockClosedIcon className="w-4 h-4 mr-2" />
          SSL
        </button>
        <button
          onClick={() => onDeleteSite(site)}
          disabled={isJobRunning}
          className="flex items-center px-3 py-2 text-sm text-red-500 bg-red-900/50 rounded-md hover:bg-red-900/70 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <TrashIcon className="w-4 h-4 mr-2" />
          Deletar
        </button>
      </div>
    </div>
  );
};

export default SiteListItem;
