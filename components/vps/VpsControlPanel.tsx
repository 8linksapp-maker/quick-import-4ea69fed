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
} from '../Icons';
import JobStatus from './JobStatus';
import ActionCard from './ActionCard';
import SiteCard from './SiteCard'; // Add this import
import CreateSiteForm from './modals/CreateSiteForm';
import WpUsersModal from './modals/WpUsersModal';
import AddWpUserForm from './modals/AddWpUserForm';
import EditWpUserForm from './modals/EditWpUserForm';
import DeleteWpUserModal from './modals/DeleteWpUserModal';
import DeleteSiteModal from './modals/DeleteSiteModal';
import DeleteVpsModal from './modals/DeleteVpsModal'; // Assuming you have this modal

const VpsControlPanel = ({ vps, onBack, onVpsDeleted, onSiteSelect }) => {
    const [woStatus, setWoStatus] = useState<'checking' | 'installed' | 'not-installed'>('checking');
    const [sites, setSites] = useState<string[]>([]);
    const [sitesLoading, setSitesLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [modalState, setModalState] = useState({ type: '', isOpen: false, data: null });
    
    const [activeJob, setActiveJob] = useState<{ action: string, title: string; status: 'running' | 'completed' | 'failed'; logFileName?: string; pidFileName?: string; logContent?: string; error?: string; warning?: string; } | null>(null);
    const pollingRef = useRef<number | null>(null);

    const [wpUsers, setWpUsers] = useState<any[]>([]);
    const [userMgmtView, setUserMgmtView] = useState<'loading' | 'user_list' | 'add_user' | 'edit_user' | 'confirm_delete'>('user_list');
    const [currentUserDomain, setCurrentUserDomain] = useState<string | null>(null);
    const [userToDelete, setUserToDelete] = useState<any | null>(null);
    const [userToEdit, setUserToEdit] = useState<any | null>(null);
    const [siteSearchTerm, setSiteSearchTerm] = useState('');
    const [siteToDelete, setSiteToDelete] = useState<string | null>(null);
    const [isDeleteVpsModalOpen, setIsDeleteVpsModalOpen] = useState(false);

    const fetchSites = useCallback(async () => {
        setSitesLoading(true);
        try {
            const { data, error: invokeError } = await supabase.functions.invoke('get-installed-sites', { body: { vpsId: vps.id } });
            if (invokeError || data?.error) throw invokeError || new Error(JSON.stringify(data.error));
            setSites(data.sites || []);
        } catch (err: any) {
            setError(`Falha ao buscar sites: ${err.message}`);
        } finally {
            setSitesLoading(false);
        }
    }, [vps.id]);

    const checkWoStatus = useCallback(async () => {
        setWoStatus('checking');
        setError(null);
        try {
          const { data, error: invokeError } = await supabase.functions.invoke('check-wordops-installed', { body: { vpsId: vps.id } });
          if (invokeError || data?.error) throw invokeError || new Error(JSON.stringify(data.error));
          if (data.installed) {
            setWoStatus('installed');
            fetchSites();
          } else {
            setWoStatus('not-installed');
          }
        } catch (err: any) {
          setError(err.message);
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
        let finalTitle: string;
        let finalError, finalWarning;

        if (job.action === 'install-ssl-site' && finalLog.includes("Aborting SSL certificate issuance")) {
            finalStatus = 'completed';
            finalTitle = 'Instalação de SSL com Aviso';
            finalWarning = 'A instalação do SSL falhou porque o DNS não aponta para o servidor. Corrija o DNS e tente novamente.';
        } else if (job.action === 'create-wordpress-site' && finalLog.includes("Aborting SSL certificate issuance")) {
            finalStatus = 'completed';
            finalTitle = 'Site Criado com Aviso';
            finalWarning = 'Site criado, mas o SSL falhou. Aponte o DNS do domínio para o IP do servidor e instale o SSL pelo painel.';
        } else if (finalLog.toLowerCase().includes('fail') || finalLog.toLowerCase().includes('error') || finalLog.toLowerCase().includes('aborting')) {
            finalStatus = 'failed';
            finalTitle = `Falha: ${job.title}`;
            finalError = 'A operação falhou. Verifique os logs para mais detalhes.';
        } else {
            finalStatus = 'completed';
            finalTitle = `${job.title} concluído!`;
        }

        setActiveJob(prev => prev ? { ...prev, status: finalStatus, title: finalTitle, error: finalError, warning: finalWarning } : null);
        
        const shouldRefetchSites = (job.action.includes('site') || job.action.includes('wordops')) && finalStatus === 'completed' && !finalWarning;
        
        if (shouldRefetchSites) {
            checkWoStatus(); // Re-check everything to get the most updated state
        }

        if (job.action.includes('wp-user') && finalStatus === 'completed' && !finalWarning && currentUserDomain) {
            handleGetUsers({ domain: currentUserDomain });
        }

        setTimeout(() => setActiveJob(null), 15000);
    };

    const pollJobStatus = useCallback(async (job) => {
        const { data, error } = await supabase.functions.invoke('get-log-and-status', {
            body: { vpsId: vps.id, logFileName: job.logFileName, pidFileName: job.pidFileName },
        });

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
            pollingRef.current = setInterval(() => {
                pollJobStatus(activeJob);
            }, 3000);
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
            const { data, error } = await supabase.functions.invoke('start-long-action', {
                body: { vpsId: vps.id, action, params },
            });

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
            const { data, error } = await supabase.functions.invoke('get-wp-users', {
                body: { vpsId: vps.id, domain },
            });

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
    
    // --- RENDER LOGIC ---

    const renderUserManagementContent = () => {
        switch (userMgmtView) {
            case 'loading':
                return <div className="text-center p-8"><LoadingSpinner /></div>;
            case 'user_list':
                return (
                    <WpUsersModal
                        users={wpUsers}
                        onClose={() => setModalState({ type: '', isOpen: false, data: null })}
                        onAdd={() => setUserMgmtView('add_user')}
                        onEdit={(user) => { setUserToEdit(user); setUserMgmtView('edit_user'); }}
                        onDelete={(user) => { setUserToDelete(user); setUserMgmtView('confirm_delete'); }}
                    />
                );
            case 'add_user':
                return (
                    <AddWpUserForm
                        domain={currentUserDomain}
                        onSubmit={(params) => startAction({ action: 'create-wp-user', params, title: `Criando usuário ${params.username}` })}
                        onCancel={() => setUserMgmtView('user_list')}
                    />
                );
            case 'edit_user':
                return (
                    <EditWpUserForm
                        user={userToEdit}
                        domain={currentUserDomain}
                        onSubmit={(params) => startAction({ action: 'update-wp-user', params, title: `Atualizando usuário` })}
                        onCancel={() => setUserMgmtView('user_list')}
                    />
                );
            case 'confirm_delete':
                return (
                    <DeleteWpUserModal
                        user={userToDelete}
                        onConfirm={(user) => startAction({ action: 'delete-wp-user', params: { domain: currentUserDomain, userId: user.ID }, title: `Deletando usuário ${user.user_login}` })}
                        onCancel={() => setUserMgmtView('user_list')}
                    />
                );
            default:
              return null;
        }
    };

    const renderMainContent = () => {
        if (woStatus === 'checking' || sitesLoading) return <div className="text-center p-8"><LoadingSpinner /> <p className="mt-4">Verificando servidor...</p></div>;
        if (error) return <div className="text-center text-red-500 bg-red-900/20 p-4 rounded-md"><strong>Erro:</strong> {error}</div>;
        
        if (woStatus === 'installed') {
            const filteredSites = sites.filter(site => site.toLowerCase().includes(siteSearchTerm.toLowerCase()));
            return (
                <div>
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold tracking-tighter text-white">Sites Instalados</h2>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><SearchIcon /></div>
                            <input type="text" placeholder="Procurar site..." className="w-full sm:w-64 bg-gray-700 border border-gray-600 rounded-md py-2 pl-10 pr-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" value={siteSearchTerm} onChange={(e) => setSiteSearchTerm(e.target.value)} />
                        </div>
                    </div>
                    {filteredSites.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {filteredSites.map(site => (
                                <SiteCard key={site} site={site} onSelect={() => onSiteSelect(site, vps)} />
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

    const isJobRunning = activeJob?.status === 'running';

    return (
        <div className="px-4 md:px-16 py-8 animate-fade-in">
            {/* Header */}
            <div className="bg-gray-900 p-6 rounded-lg shadow-lg mb-6">
                <button onClick={onBack} className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 mb-4">
                    <ArrowLeftIcon className="w-5 h-5" />
                    Voltar para a lista de VPS
                </button>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                    <h1 className="text-3xl font-bold tracking-tighter text-white mb-2 md:mb-0">{vps.host}</h1>
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                        {woStatus === 'installed' && <CheckCircleIcon className="text-green-500 w-5 h-5" />}
                        {woStatus === 'not-installed' && <XCircleIcon className="text-red-500 w-5 h-5" />}
                        <span>{woStatus === 'installed' ? 'WordOps Instalado' : (woStatus === 'not-installed' ? 'WordOps Não Instalado' : 'Verificando status do WordOps...')}</span>
                    </div>
                </div>
            </div>

            {/* Action Bar */}
            {woStatus === 'installed' && (
                <div className="flex flex-col md:flex-row items-center justify-end gap-4 mb-8">
                    <button 
                        onClick={() => setModalState({ type: 'create-site', isOpen: true, data: null })}
                        disabled={isJobRunning}
                        className="bg-green-600 text-white py-2 px-5 rounded-lg hover:bg-green-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition duration-200 ease-in-out shadow-lg transform hover:scale-105"
                    >
                        Instalar Site WordPress
                    </button>
                    <button 
                        onClick={() => setIsDeleteVpsModalOpen(true)}
                        disabled={isJobRunning}
                        className="bg-red-600 text-white py-2 px-5 rounded-lg hover:bg-red-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition duration-200 ease-in-out shadow-lg transform hover:scale-105"
                    >
                        Deletar VPS
                    </button>
                </div>
            )}

            {/* Job Status */}
            {activeJob && (
                <div className="mb-8 p-6 bg-gray-800 border border-gray-700 rounded-lg shadow-md">
                    <h2 className="text-xl font-semibold text-white mb-4">Status da Tarefa</h2>
                    <JobStatus {...activeJob} />
                </div>
            )}

            {/* Main Content */}
            {renderMainContent()}

            {/* Modals */}
            {modalState.isOpen && modalState.type === 'create-site' && (
                <Modal isOpen={true} onClose={() => setModalState({ type: '', isOpen: false, data: null })} title="Criar Novo Site WordPress">
                    <CreateSiteForm onSubmit={(params) => startAction({ action: 'create-wordpress-site', params, title: `Criando site ${params.domain}` })} onCancel={() => setModalState({ type: '', isOpen: false, data: null })} />
                </Modal>
            )}
            
            {modalState.isOpen && modalState.type === 'manage-wp-users' && (
                <Modal isOpen={true} onClose={() => setModalState({ type: '', isOpen: false, data: null })} title={`Gerenciando Usuários de ${currentUserDomain}`}>
                    {renderUserManagementContent()}
                </Modal>
            )}

            {siteToDelete && (
                <DeleteSiteModal 
                    site={siteToDelete}
                    onConfirm={(site) => startAction({ action: 'delete-wordpress-site', params: { domain: site }, title: `Deletando site ${site}` })}
                    onCancel={() => setSiteToDelete(null)}
                />
            )}

            {isDeleteVpsModalOpen && (
                <DeleteVpsModal
                    onConfirm={handleDeleteVps}
                    onCancel={() => setIsDeleteVpsModalOpen(false)}
                />
            )}
        </div>
    );
};

export default VpsControlPanel;