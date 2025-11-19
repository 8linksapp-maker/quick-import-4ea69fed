import React from 'react';
import SiteListItemWithDropdown from './SiteListItemWithDropdown';

const SiteList = ({ sites, onManageUsers, onInstallSsl, onDeleteSite, isJobRunning }) => (
    <div className="space-y-4">
        <h2 className="text-2xl font-bold tracking-tighter text-white mb-4">Sites Instalados</h2>
        {sites.length > 0 ? (
            <div className="bg-gray-900/50 rounded-lg">
                {sites.map(site => (
                    <SiteListItemWithDropdown 
                        key={site} 
                        site={site} 
                        onManageUsers={onManageUsers}
                        onInstallSsl={onInstallSsl}
                        onDeleteSite={onDeleteSite}
                        isJobRunning={isJobRunning}
                    />
                ))}
            </div>
        ) : (
            <div className="text-center py-10 px-4 bg-gray-800 border-2 border-dashed border-gray-700 rounded-lg">
                <p className="text-gray-400">Nenhum site WordPress instalado nesta VPS.</p>
                <p className="text-sm text-gray-500 mt-2">Use o botão "Instalar Site WordPress" para começar.</p>
            </div>
        )}
    </div>
);

export { SiteList };