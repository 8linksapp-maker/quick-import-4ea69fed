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
import EditWpSiteForm from '../EditWpSiteForm';
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

    const normalizeUrl = (url: string) => url.replace(/^(?:https?:\/\/)?(?:www\.)?/i, "").replace(/\/$/, "");

    const fetchSites = useCallback(async () => {
        setSitesLoading(true);
        setError(null); // Limpar erros antes de tentar buscar novamente
        try {
            const { data, error: invokeError } = await supabase.functions.invoke('get-installed-sites', { body: { vpsId: vps.id } });
            if (invokeError) { // Erro de comunicação com o Supabase
                throw invokeError;
            }

            if (data && data.error) { // Erro reportado pela Edge Function
                throw new Error(data.error);
            }

            setSites(data.sites || []);
            return true; // Sucesso
        } catch (err: any) {
            console.error("Erro ao buscar sites:", err);
            setError(`Falha ao buscar sites: ${err.message}`);
            return false; // Falha
        } finally {
            setSitesLoading(false);
        }
    }, [vps.id]);

    const checkWoStatus = useCallback(async () => {
        setWoStatus('checking');
        setError(null);
        try {
          const { data, error: invokeError } = await supabase.functions.invoke('check-wordops-installed', { body: { vpsId: vps.id } });
          
          if (invokeError) { // Erro de comunicação com o Supabase
            throw invokeError;
          }

          if (data && data.error) {
            setError(`Erro: ${data.error}`); // Exibir erro específico da Edge Function
            setWoStatus('not-installed');
            return;
          }

          if (data && data.installed) {
            // Se o WordOps estiver instalado, tenta buscar os sites.
            // Se fetchSites falhar, o woStatus não deve ser 'installed'.
            const sitesFetchedSuccessfully = await fetchSites(); // <-- Usa o retorno booleano
            if (sitesFetchedSuccessfully) {
                setWoStatus('installed');
            } else {
                setWoStatus('not-installed'); // Ou um estado de erro mais específico se necessário
            }
          } else {
            setWoStatus('not-installed');
          }
        } catch (err: any) {
          console.error("Erro inesperado em checkWoStatus:", err);
          setError(`Erro desconhecido ao verificar o status do WordOps: ${err.message}`);
          setWoStatus('not-installed');
        }
    }, [vps.id, fetchSites]);
    
    useEffect(() => { checkWoStatus(); }, [checkWoStatus]);
    
    const stopPolling = () => {
        if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
        }
    };

    const handleJobCompletion = (job) => {
        const finalLog = job.logContent || '';
        let finalStatus: 'completed' | 'failed';
        let finalTitle: string, finalError, finalWarning;

        if (job.action === 'install-ssl-site' && finalLog.includes("Aborting SSL certificate issuance")) {
            finalStatus = 'completed'; finalTitle = 'Instalação de SSL com Aviso';
            finalWarning = 'A instalação do SSL falhou porque o DNS não aponta para o servidor. Corrija o DNS e tente novamente.';
        } else if (job.action === 'create-wordpress-site' && finalLog.includes("Aborting SSL certificate issuance")) {
            finalStatus = 'completed'; finalTitle = 'Site Criado com Aviso';
            finalWarning = 'Site criado, mas o SSL falhou. Aponte o DNS do domínio para o IP do servidor e instale o SSL pelo painel.';
        } else if (finalLog.toLowerCase().includes('fail') || finalLog.toLowerCase().includes('error') || finalLog.toLowerCase().includes('aborting')) {
            finalStatus = 'failed'; finalTitle = `Falha: ${job.title}`;
            finalError = 'A operação falhou. Verifique os logs para mais detalhes.';
        } else {
            finalStatus = 'completed'; finalTitle = `${job.title} concluído!`;
        }
        setActiveJob(prev => prev ? { ...prev, status: finalStatus, title: finalTitle, error: finalError, warning: finalWarning } : null);
        const shouldRefetchSites = (job.action.includes('site') || job.action.includes('wordops')) && finalStatus === 'completed' && !finalWarning;
        if (shouldRefetchSites) checkWoStatus();
        if (job.action.includes('wp-user') && finalStatus === 'completed' && !finalWarning && currentUserDomain) {
            handleGetUsers({ domain: currentUserDomain });
        }
        setTimeout(() => setActiveJob(null), 15000);
    };

    const pollJobStatus = useCallback(async (job) => {
        const { data, error } = await supabase.functions.invoke('get-log-and-status', { body: { vpsId: vps.id, logFileName: job.logFileName, pidFileName: job.pidFileName }});
        if (error) {
            setActiveJob(prev => prev ? { ...prev, status: 'failed', error: `Erro ao consultar status: ${error.message}` } : null);
            stopPolling();
            return;
        }
        setActiveJob(prev => prev ? { ...prev, logContent: data.logContent } : null);
        if (data.status === 'finished') {
            stopPolling();
            handleJobCompletion({ ...job, logContent: data.logContent });
        }
    }, [vps.id, handleJobCompletion]);


    useEffect(() => {
        if (activeJob?.status === 'running' && activeJob.logFileName && activeJob.pidFileName && !pollingRef.current) {
            pollingRef.current = setInterval(() => pollJobStatus(activeJob), 3000);
        }
        return () => stopPolling();
    }, [activeJob, pollJobStatus]);

    const startAction = async ({ action, params, title }) => {
        setModalState({ type: '', isOpen: false, data: null });
        setSiteToDelete(null);
        setIsDeleteVpsModalOpen(false);
        setUserMgmtView('user_list');
        setActiveJob({ action, title, status: 'running' });
        try {
            const { data, error } = await supabase.functions.invoke('start-long-action', { body: { vpsId: vps.id, action, params }});
            if (error || data.error) throw error || new Error(data.error);
            setActiveJob(prev => prev ? { ...prev, logFileName: data.logFileName, pidFileName: data.pidFileName } : null);
        } catch (err: any) {
            setActiveJob({ action, title, status: 'failed', error: err.message });
        }
    };

    const handleGetUsers = async ({ domain }) => {
        setModalState({ type: 'manage-wp-users', isOpen: true, data: null });
        setUserMgmtView('loading');
        setCurrentUserDomain(domain);
        try {
            const { data, error } = await supabase.functions.invoke('get-wp-users', { body: { vpsId: vps.id, domain }});
            if (error || data.error) throw error || new Error(JSON.stringify(data.error));
            setWpUsers(data.users || []);
            setUserMgmtView('user_list');
        } catch (err: any) {
            setError(`Falha ao buscar usuários: ${err.message}`);
            setModalState({ type: '', isOpen: false, data: null });
        }
    };

    const handleDeleteVps = async () => {
        try {
          const { data, error: invokeError } = await supabase.functions.invoke('delete-vps-credentials', { body: { id: vps.id } });
          if (invokeError || data?.error) throw invokeError || new Error(JSON.stringify(data.error));
          onVpsDeleted();
        } catch (err: any) {
          alert(`Falha ao deletar o VPS: ${err.message}`);
        }
      };

    const handleWpSiteUpdated = () => {
        setIsEditModalOpen(false);
    };

    const handleEditSite = (siteDomain: string) => {
        const normalizedSiteDomain = normalizeUrl(siteDomain);
        const connectedSiteData = connectedSites.find(cs => normalizeUrl(cs.site_url) === normalizedSiteDomain);
        if (connectedSiteData) {
            setSiteToEdit(connectedSiteData);
            setIsEditModalOpen(true);
        } else {
            alert('Apenas sites "Conectados" podem ser editados. Conecte este site na aba "Sites" para habilitar a edição.');
        }
    };

    const renderUserManagementContent = () => {
        switch (userMgmtView) {
            case 'loading': return <div className="text-center p-8"><LoadingSpinner /></div>;
            case 'user_list': return <WpUsersModal users={wpUsers} onClose={() => setModalState({ type: '', isOpen: false, data: null })} onAdd={() => setUserMgmtView('add_user')} onEdit={(user) => { setUserToEdit(user); setUserMgmtView('edit_user'); }} onDelete={(user) => { setUserToDelete(user); setUserMgmtView('confirm_delete'); }} />;
            case 'add_user': return <AddWpUserForm domain={currentUserDomain} onSubmit={(params) => startAction({ action: 'create-wp-user', params, title: `Criando usuário ${params.username}` })} onCancel={() => setUserMgmtView('user_list')} />;
            case 'edit_user': return <EditWpUserForm user={userToEdit} domain={currentUserDomain} onSubmit={(params) => startAction({ action: 'update-wp-user', params, title: `Atualizando usuário` })} onCancel={() => setUserMgmtView('user_list')} />;
            case 'confirm_delete': return <DeleteWpUserModal user={userToDelete} onConfirm={(user) => startAction({ action: 'delete-wp-user', params: { domain: currentUserDomain, userId: user.ID }, title: `Deletando usuário ${user.user_login}` })} onCancel={() => setUserMgmtView('user_list')} />;
            default: return null;
        }
    };

    const renderMainContent = () => {
        if (woStatus === 'checking' || sitesLoading) return <div className="text-center p-8"><LoadingSpinner /> <p className="mt-4">Verificando servidor...</p></div>;
        if (error && !error.includes("Falha ao buscar sites")) return <div className="text-center text-red-500 bg-red-900/20 p-4 rounded-md"><strong>Erro:</strong> {error}</div>;
        
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
                                <button onClick={() => setViewMode('grid')} className={`p-2 rounded-l-md ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}><GridIcon className="w-5 h-5" /></button>
                                <button onClick={() => setViewMode('list')} className={`p-2 rounded-r-md ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}><ListIcon className="w-5 h-5" /></button>
                            </div>
                        </div>
                    </div>
                    {sitesLoading ? (
                        <div className="flex items-center gap-2 text-gray-400"><LoadingSpinner /> Carregando sites...</div>
                    ) : sites.length === 0 && error && error.includes("Falha ao buscar sites") ? (
                        <div className="text-center py-10 px-4 bg-red-900/20 border-2 border-dashed border-red-700 rounded-lg">
                            <p className="text-red-400 font-bold">Atenção: WordOps está instalado, mas não foi possível listar os sites.</p>
                            <p className="text-sm text-red-500 mt-2">Isso pode ocorrer se não houver sites WordPress instalados ou se houver um problema com a configuração do Nginx. Erro: {error}</p>
                            <p className="text-sm text-gray-500 mt-2">Você pode tentar criar um novo site ou verificar a instalação do WordOps na VPS.</p>
                        </div>
                    ) : sites.length === 0 ? (
                        <div className="text-center py-10 px-4 bg-gray-800 border-2 border-dashed border-gray-700 rounded-lg">
                            <p className="text-gray-400">Nenhum site WordPress instalado nesta VPS.</p>
                            <p className="text-sm text-gray-500 mt-2">Use o botão "Instalar Site WordPress" para começar.</p>
                        </div>
                    ) : (
                        viewMode === 'grid' ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {filteredSites.map(site => {
                                    const normalizedSite = normalizeUrl(site);
                                    const wpData = connectedSites.find(cs => normalizeUrl(cs.site_url) === normalizedSite);
                                    const isConnected = !!wpData;
                                    console.log('Checking site:', site, 'Normalized:', normalizedSite, 'Found WpData:', wpData, 'Connected Sites:', connectedSites);
                                    return (
                                        <SiteCard 
                                            key={site} 
                                            site={site} 
                                            isConnected={isConnected}
                                            onSelect={() => onSiteSelect(site, vps, wpData)}
                                            onDelete={() => setSiteToDelete(site)}
                                            onEdit={() => handleEditSite(site)}
                                            onInstallSsl={() => startAction({ action: 'install-ssl-site', params: { domain: site }, title: `Instalando SSL em ${site}` })}
                                        />
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {filteredSites.map(site => {
                                    const isConnected = connectedSites.some(cs => normalizeUrl(cs.site_url) === normalizeUrl(site));
                                    return (
<SiteListItem
    key={site}
    site={site}
    isConnected={isConnected}
    onSelect={() => onSiteSelect(site, vps, connectedSites.find(cs => normalizeUrl(cs.site_url) === normalizedSite))}
    onDelete={() => setSiteToDelete(site)}
    onEdit={() => handleEditSite(site)}
    onInstallSsl={() => startAction({ action: 'install-ssl-site', params: { domain: site }, title: `Instalando SSL em ${site}` })}
/>
                                    );
                                })}
                            </div>
                        )
                    )}
                </div>
            );
        }
        if (woStatus === 'not-installed') {
            const isJobRunning = activeJob?.status === 'running';
            return (
                <div className="max-w-md mx-auto mt-10">
                    <ActionCard 
                        title="Instalar WordOps" 
                        onClick={() => { if(window.confirm('Isso iniciará a instalação do WordOps. Pode levar vários minutos. Continuar?')) startAction({ action: 'install-wordops', params: {}, title: 'Instalando WordOps' })}} 
                        loading={isJobRunning} 
                    />
                </div>
            );
        }
        return null;
    };

    return (
        <div className="px-4 md:px-16 py-8 animate-fade-in">
            <div className="bg-gray-900 p-6 rounded-lg shadow-lg mb-6">
                <button onClick={onBack} className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 mb-4"><ArrowLeftIcon className="w-5 h-5" />Voltar para a lista de VPS</button>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                    <h1 className="text-3xl font-bold tracking-tighter text-white mb-2 md:mb-0">{vps.host}</h1>
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                        {woStatus === 'installed' && <CheckCircleIcon className="text-green-500 w-5 h-5" />}
                        {woStatus === 'not-installed' && <XCircleIcon className="text-red-500 w-5 h-5" />}
                        <span>{woStatus === 'installed' ? 'WordOps Instalado' : (woStatus === 'not-installed' ? 'WordOps Não Instalado' : 'Verificando...')}</span>
                    </div>
                </div>
            </div>

            {woStatus === 'installed' && (
                <div className="flex flex-col md:flex-row items-center justify-end gap-4 mb-8">
                    <button onClick={() => setModalState({ type: 'create-site', isOpen: true, data: null })} disabled={activeJob?.status === 'running'} className="bg-green-600 text-white py-2 px-5 rounded-lg hover:bg-green-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition duration-200 ease-in-out shadow-lg transform hover:scale-105">Instalar Site WordPress</button>
                    <button onClick={() => setIsDeleteVpsModalOpen(true)} disabled={activeJob?.status === 'running'} className="bg-red-600 text-white py-2 px-5 rounded-lg hover:bg-red-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition duration-200 ease-in-out shadow-lg transform hover:scale-105">Deletar VPS</button>
                </div>
            )}

            {activeJob && (
                <div className="mb-8 p-6 bg-gray-800 border border-gray-700 rounded-lg shadow-md">
                    <h2 className="text-xl font-semibold text-white mb-4">Status da Tarefa</h2>
                    <JobStatus {...activeJob} />
                </div>
            )}
            
            {renderMainContent()}

            <Modal isOpen={modalState.isOpen && modalState.type === 'create-site'} onClose={() => setModalState({ type: '', isOpen: false, data: null })} title="Criar Novo Site WordPress"><CreateSiteForm onSubmit={(params) => startAction({ action: 'create-wordpress-site', params, title: `Criando site ${params.domain}` })} onCancel={() => setModalState({ type: '', isOpen: false, data: null })} /></Modal>
            <Modal isOpen={modalState.isOpen && modalState.type === 'manage-wp-users'} onClose={() => setModalState({ type: '', isOpen: false, data: null })} title={`Gerenciando Usuários de ${currentUserDomain}`}>{renderUserManagementContent()}</Modal>
            {siteToDelete && <DeleteSiteModal site={siteToDelete} onConfirm={(site) => startAction({ action: 'delete-wordpress-site', params: { domain: site }, title: `Deletando site ${site}` })} onCancel={() => setSiteToDelete(null)} />}
            {isDeleteVpsModalOpen && <DeleteVpsModal onConfirm={handleDeleteVps} onCancel={() => setIsDeleteVpsModalOpen(false)} />}
            {siteToEdit && <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Editar Site WordPress"><EditWpSiteForm site={siteToEdit} onWpSiteUpdated={handleWpSiteUpdated} onCancel={() => setIsEditModalOpen(false)} /></Modal>}
        </div>
    );
};

export default VpsControlPanel;
