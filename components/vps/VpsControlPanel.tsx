import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../src/supabaseClient';
import { VpsData } from '../VpsCard';
import Modal from '../Modal';
import {
    ArrowLeftIcon,
    CheckCircleIcon,
    XCircleIcon,
    LoadingSpinner,
    SearchIcon,
    GridIcon,
    ListIcon,
} from '../Icons';
import JobStatus from './JobStatus';
import ActionCard from './ActionCard';
import SiteCard from './SiteCard';
import SiteListItem from './SiteListItem';
import CreateSiteForm from './modals/CreateSiteForm';
import WpUsersModal from './modals/WpUsersModal';
import AddWpUserForm from './modals/AddWpUserForm';
import EditWpUserForm from '../EditWpSiteForm';
import DeleteWpUserModal from './modals/DeleteWpUserModal';
import DeleteSiteModal from './modals/DeleteSiteModal';
import DeleteVpsModal from './modals/DeleteVpsModal';
import { WpData } from '../WpCard';


const VpsControlPanel = ({ vps, onBack, onVpsDeleted, onSiteSelect, connectedSites = [] }) => {
    const [woStatus, setWoStatus] = useState<'checking' | 'installed' | 'not-installed'>('checking');
    const [sites, setSites] = useState<string[]>([]);
    const [sitesLoading, setSitesLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [modalState, setModalState] = useState({ type: '', isOpen: false, data: null });
    const [activeJob, setActiveJob] = useState<any>(null);
    const pollingRef = useRef<number | null>(null);
    const [wpUsers, setWpUsers] = useState<any[]>([]);
    const [userMgmtView, setUserMgmtView] = useState('user_list');
    const [currentUserDomain, setCurrentUserDomain] = useState<string | null>(null);
    const [userToDelete, setUserToDelete] = useState<any | null>(null);
    const [userToEdit, setUserToEdit] = useState<any | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [siteSearchTerm, setSiteSearchTerm] = useState('');
    const [siteToDelete, setSiteToDelete] = useState<string | null>(null);
    const [isDeleteVpsModalOpen, setIsDeleteVpsModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [siteToEdit, setSiteToEdit] = useState<WpData | null>(null);


    const fetchSites = useCallback(async () => {
        // ... fetch sites logic
    }, [vps.id]);

    const checkWoStatus = useCallback(async () => {
        // ... check WO status logic
    }, [vps.id, fetchSites]);
    
    useEffect(() => { checkWoStatus(); }, [checkWoStatus]);

    const handleWpSiteUpdated = () => {
        setIsEditModalOpen(false);
        // Idealmente, isso deveria acionar um refetch dos connectedSites na BlogHousePage
        // onContentUpdated(); // Supondo que uma prop assim seja passada
    };

    const handleEditSite = (siteDomain: string) => {
        const connectedSiteData = connectedSites.find(cs => cs.site_url === siteDomain);
        if (connectedSiteData) {
            setSiteToEdit(connectedSiteData);
            setIsEditModalOpen(true);
        } else {
            alert('Apenas sites "Conectados" podem ser editados. Conecte este site na aba "Sites" para habilitar a edição.');
        }
    };
    
    // ... all other handlers and logic ...

    const renderMainContent = () => {
        if (woStatus === 'checking' || sitesLoading) return <div className="text-center p-8"><LoadingSpinner /> <p className="mt-4">Verificando servidor...</p></div>;
        if (error) return <div className="text-center text-red-500 bg-red-900/20 p-4 rounded-md"><strong>Erro:</strong> {error}</div>;
        
        if (woStatus === 'installed') {
            const filteredSites = sites.filter(site => site.toLowerCase().includes(siteSearchTerm.toLowerCase()));
            return (
                <div>
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold tracking-tighter text-white">Sites Instalados</h2>
                        <div className="flex items-center">
                            <div className="relative mr-4">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><SearchIcon className="w-5 h-5 text-gray-400" /></div>
                                <input type="text" placeholder="Procurar site..." className="w-full sm:w-64 bg-gray-700 border border-gray-600 rounded-md py-2 pl-10 pr-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" value={siteSearchTerm} onChange={(e) => setSiteSearchTerm(e.target.value)} />
                            </div>
                            <div className="flex items-center">
                                <button onClick={() => setViewMode('grid')} className={`p-2 rounded-l-md ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}>
                                    <GridIcon className="w-5 h-5" />
                                </button>
                                <button onClick={() => setViewMode('list')} className={`p-2 rounded-r-md ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}>
                                    <ListIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                    {filteredSites.length > 0 ? (
                        viewMode === 'grid' ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {filteredSites.map(site => {
                                    const isConnected = connectedSites.some(cs => cs.site_url === site);
                                    return (
                                        <SiteCard 
                                            key={site} 
                                            site={site} 
                                            isConnected={isConnected}
                                            onSelect={() => onSiteSelect(site, vps, connectedSites.find(cs => cs.site_url === site))}
                                            onDelete={() => setSiteToDelete(site)}
                                            onEdit={() => handleEditSite(site)}
                                        />
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {filteredSites.map(site => {
                                    const isConnected = connectedSites.some(cs => cs.site_url === site);
                                    return (
                                        <SiteListItem
                                            key={site}
                                            site={site}
                                            isConnected={isConnected}
                                            onSelect={() => onSiteSelect(site, vps, connectedSites.find(cs => cs.site_url === site))}
                                            onDelete={() => setSiteToDelete(site)}
                                            onEdit={() => handleEditSite(site)}
                                        />
                                    );
                                })}
                            </div>
                        )
                    ) : (
                        <div className="text-center py-10 px-4 bg-gray-800 border-2 border-dashed border-gray-700 rounded-lg">
                            <p className="text-gray-400">Nenhum site WordPress instalado nesta VPS.</p>
                            <p className="text-sm text-gray-500 mt-2">Use o botão "Instalar Site WordPress" para começar.</p>
                        </div>
                    )}
                </div>
            );
        }
        return null; // Simplified, add other statuses if needed
    };

    return (
        <div className="px-4 md:px-16 py-8 animate-fade-in">
            {/* Header, Action Bar, Job Status */}
            {/* ... */}
            
            {/* Main Content */}
            {renderMainContent()}

            {/* Modals */}
            {/* ... */}
            {siteToEdit && (
                <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Editar Site WordPress">
                    <EditWpSiteForm site={siteToEdit} onWpSiteUpdated={handleWpSiteUpdated} onCancel={() => setIsEditModalOpen(false)} />
                </Modal>
            )}
        </div>
    );
};

export default VpsControlPanel;
