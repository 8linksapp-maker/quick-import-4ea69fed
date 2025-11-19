import React from 'react';

const SiteListItem = ({ site, onManageSite, onManageUsers, isJobRunning }) => (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <span className="font-semibold text-lg text-white break-all">{site}</span>
        <div className="flex items-center gap-3 flex-shrink-0 w-full sm:w-auto">
            <a 
                href={`https://${site}/wp-admin`} 
                target="_blank" 
                rel="noopener noreferrer" 
                className={`text-sm bg-blue-600 text-white py-2 px-3 rounded-md hover:bg-blue-700 transition-colors w-full sm:w-auto text-center ${isJobRunning ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
                Painel WP
            </a>
            <button 
                onClick={onManageUsers} 
                disabled={isJobRunning} 
                className="text-sm bg-gray-600 text-white py-2 px-3 rounded-md hover:bg-gray-500 disabled:opacity-50 transition-colors w-full sm:w-auto"
            >
                Usuários
            </button>
            <button 
                onClick={onManageSite} 
                disabled={isJobRunning} 
                className="text-sm bg-gray-600 text-white py-2 px-3 rounded-md hover:bg-gray-500 disabled:opacity-50 transition-colors w-full sm:w-auto"
            >
                Gerenciar
            </button>
        </div>
    </div>
);

const SiteList = ({ sites, onManageSite, onManageUsers, isJobRunning }) => (
    <div className="space-y-4">
        <h2 className="text-2xl font-bold tracking-tighter text-white">Sites Instalados</h2>
        {sites.length > 0 ? (
            sites.map(site => (
                <SiteListItem 
                    key={site} 
                    site={site} 
                    onManageUsers={() => onManageUsers(site)}
                    onManageSite={() => onManageSite(site)}
                    isJobRunning={isJobRunning}
                />
            ))
        ) : (
            <div className="text-center py-10 px-4 bg-gray-800 border-2 border-dashed border-gray-700 rounded-lg">
                <p className="text-gray-400">Nenhum site WordPress instalado nesta VPS.</p>
                <p className="text-sm text-gray-500 mt-2">Use o botão "Instalar Site WordPress" para começar.</p>
            </div>
        )}
    </div>
);

export { SiteListItem, SiteList };