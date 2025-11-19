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
        // ... user management JSX
    };

    const renderMainContent = () => {
        // ... main content JSX with view mode logic
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
