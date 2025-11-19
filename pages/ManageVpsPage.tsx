import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../src/supabaseClient';
import InputField from '../components/InputField';
import VpsCard, { VpsData } from '../components/VpsCard';
import Modal from '../components/Modal';
import { AddIcon as PlusIcon, SearchIcon, ArrowLeftIcon, CubeIcon, CheckCircleIcon, XCircleIcon, LoadingSpinner } from '../components/Icons';

// #region Sub-components for Control Panel
const OutputModal = ({ output, onClose }) => (
    <Modal isOpen={true} onClose={onClose} title="Resultado do Comando">
        <pre className="bg-black text-white p-4 rounded-md max-h-96 overflow-y-auto text-xs">
            <code>{output}</code>
        </pre>
        <div className="flex justify-end mt-4">
            <button onClick={onClose} className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"> Fechar</button>
        </div>
    </Modal>
);

const CreateSiteForm = ({ onSubmit, onCancel }) => {
    const [domain, setDomain] = useState('');
    const [user, setUser] = useState('admin');
    const [pass, setPass] = useState('');
    const [email, setEmail] = useState('');
  
    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      onSubmit({ domain, user, pass, email });
    };
  
    return (
      <form onSubmit={handleSubmit}>
        <InputField label="Domínio" id="domain" type="text" value={domain} onChange={(e) => setDomain(e.target.value)} required />
        <InputField label="Usuário WP" id="user" type="text" value={user} onChange={(e) => setUser(e.target.value)} required />
        <InputField label="Senha WP" id="pass" type="password" value={pass} onChange={(e) => setPass(e.target.value)} required />
        <InputField label="Email WP" id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <div className="flex justify-end items-center gap-4 mt-6">
          <button type="button" onClick={onCancel} className="text-gray-400 hover:text-white">Cancelar</button>
          <button type="submit" className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700">
            Criar Site
          </button>
        </div>
      </form>
    );
};

const InstallSslForm = ({ sites, onSubmit, onCancel }) => {
    const [domain, setDomain] = useState(sites[0] || '');
    return (
        <form onSubmit={(e) => { e.preventDefault(); onSubmit({ domain }); }}>
            <label htmlFor="sslDomain" className="block text-sm font-medium text-gray-300 mb-2">Selecione o Site</label>
            <select id="sslDomain" value={domain} onChange={(e) => setDomain(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                {sites.map(site => <option key={site} value={site}>{site}</option>)}
            </select>
            <div className="flex justify-end items-center gap-4 mt-6">
                <button type="button" onClick={onCancel} className="text-gray-400 hover:text-white">Cancelar</button>
                <button type="submit" disabled={!domain} className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-500">
                    Instalar SSL
                </button>
            </div>
        </form>
    );
};

const ManageWpUsersForm = ({ sites, onSubmit, onCancel }) => {
    const [domain, setDomain] = useState(sites[0] || '');
    return (
        <form onSubmit={(e) => { e.preventDefault(); onSubmit({ domain }); }}>
            <label htmlFor="wpUserDomain" className="block text-sm font-medium text-gray-300 mb-2">Selecione o Site</label>
            <select id="wpUserDomain" value={domain} onChange={(e) => setDomain(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                {sites.map(site => <option key={site} value={site}>{site}</option>)}
            </select>
            <div className="flex justify-end items-center gap-4 mt-6">
                <button type="button" onClick={onCancel} className="text-gray-400 hover:text-white">Cancelar</button>
                <button type="submit" disabled={!domain} className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-500">
                    Listar Usuários
                </button>
            </div>
        </form>
    );
};

const AddWpUserForm = ({ domain, onSubmit, onCancel }) => {
    const [userLogin, setUserLogin] = useState('');
    const [userPass, setUserPass] = useState('');
    const [userEmail, setUserEmail] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({ domain, username: userLogin, pass: userPass, email: userEmail, role: 'subscriber' });
    };

    return (
        <form onSubmit={handleSubmit}>
            <InputField label="Username" id="user_login" type="text" value={userLogin} onChange={(e) => setUserLogin(e.target.value)} required />
            <InputField label="Password" id="user_pass" type="password" value={userPass} onChange={(e) => setUserPass(e.target.value)} required />
            <InputField label="Email" id="user_email" type="email" value={userEmail} onChange={(e) => setUserEmail(e.target.value)} required />
            <div className="flex justify-end items-center gap-4 mt-6">
                <button type="button" onClick={onCancel} className="text-gray-400 hover:text-white">Cancelar</button>
                <button type="submit" className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700">
                    Adicionar Usuário
                </button>
            </div>
        </form>
    );
};

const EditWpUserForm = ({ user, domain, onSubmit, onCancel }) => {
    const [userPass, setUserPass] = useState('');
    const [userRole, setUserRole] = useState(user.roles);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({ domain, userId: user.ID, pass: userPass, role: userRole });
    };

    return (
        <form onSubmit={handleSubmit}>
            <p className="mb-4 text-gray-300">Editando usuário: <strong>{user.user_login}</strong></p>
            <InputField label="Nova Senha (deixe em branco para não alterar)" id="user_pass" type="password" value={userPass} onChange={(e) => setUserPass(e.target.value)} />
            <label htmlFor="user_role" className="block text-sm font-medium text-gray-300 mb-2">Role</label>
            <select id="user_role" value={userRole} onChange={(e) => setUserRole(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="administrator">Administrator</option>
                <option value="editor">Editor</option>
                <option value="author">Author</option>
                <option value="contributor">Contributor</option>
                <option value="subscriber">Subscriber</option>
            </select>
            <div className="flex justify-end items-center gap-4 mt-6">
                <button type="button" onClick={onCancel} className="text-gray-400 hover:text-white">Cancelar</button>
                <button type="submit" className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700">
                    Atualizar Usuário
                </button>
            </div>
        </form>
    );
};


const DeleteVpsModal = ({ onConfirm, onCancel }) => {
    const [confirmationText, setConfirmationText] = useState('');
    const isConfirmed = confirmationText === 'EXCLUIR';

    return (
        <Modal isOpen={true} onClose={onCancel} title="Confirmar Exclusão da VPS">
            <p className="text-gray-300 mb-4">Esta ação é irreversível. As credenciais desta VPS serão permanentemente removidas.</p>
            <p className="text-gray-300 mb-4">Para confirmar, digite <strong>EXCLUIR</strong> no campo abaixo.</p>
            <InputField
                id="delete-confirm"
                type="text"
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                placeholder="EXCLUIR"
            />
            <div className="flex justify-end items-center gap-4 mt-6">
                <button type="button" onClick={onCancel} className="text-gray-400 hover:text-white">Cancelar</button>
                <button 
                    type="button" 
                    onClick={onConfirm} 
                    disabled={!isConfirmed} 
                    className="bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 disabled:bg-gray-500 disabled:cursor-not-allowed"
                >
                    Excluir Permanentemente
                </button>
            </div>
        </Modal>
    );
};

const DeleteWpUserModal = ({ user, onConfirm, onCancel }) => {
    if (!user) return null;
    return (
        <Modal isOpen={true} onClose={onCancel} title="Confirmar Exclusão de Usuário">
            <p className="text-gray-300 mb-4">
                Tem certeza que deseja excluir o usuário <strong>{user.user_login}</strong>? Esta ação é irreversível.
            </p>
            <div className="flex justify-end items-center gap-4 mt-6">
                <button type="button" onClick={onCancel} className="text-gray-400 hover:text-white">Cancelar</button>
                <button 
                    type="button" 
                    onClick={() => onConfirm(user)} 
                    className="bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700"
                >
                    Excluir Usuário
                </button>
            </div>
        </Modal>
    );
};

const ActionCard = ({ title, onClick, loading = false }) => (
    <div 
      className={`bg-gray-800 border border-gray-700 rounded-lg p-6 text-center transition-colors ${!loading ? 'cursor-pointer hover:bg-gray-700 hover:border-blue-500' : 'opacity-50 cursor-not-allowed'}`}
      onClick={!loading ? onClick : undefined}
    >
      <div className="flex flex-col items-center justify-center h-full">
        {loading ? <LoadingSpinner /> : <CubeIcon className="w-10 h-10 text-blue-400 mb-4" />}
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>
    </div>
);

const JobStatus = ({ title, status, error, warning, logContent }) => {
    let statusInfo = {
        color: 'blue',
        textColor: 'text-blue-300',
        bgColor: 'bg-blue-900/30',
        borderColor: 'border-blue-500',
        iconColor: 'text-blue-400',
        icon: <LoadingSpinner />
    };

    if (status === 'completed') {
        statusInfo = { ...statusInfo, color: 'green', textColor: 'text-green-300', bgColor: 'bg-green-900/30', borderColor: 'border-green-500', iconColor: 'text-green-400', icon: <CheckCircleIcon /> };
    } else if (status === 'failed') {
        statusInfo = { ...statusInfo, color: 'red', textColor: 'text-red-300', bgColor: 'bg-red-900/30', borderColor: 'border-red-500', iconColor: 'text-red-400', icon: <XCircleIcon /> };
    }
    
    if (warning) {
        statusInfo.color = 'yellow';
        statusInfo.textColor = 'text-yellow-300';
        statusInfo.bgColor = 'bg-yellow-900/30';
        statusInfo.borderColor = 'border-yellow-500';
        statusInfo.iconColor = 'text-yellow-400';
    }

    return (
        <div className={`${statusInfo.bgColor} border ${statusInfo.borderColor} rounded-lg p-4 mb-6 animate-fade-in`}>
            <div className="flex items-center">
                <div className={`mr-4 ${statusInfo.iconColor}`}>{statusInfo.icon}</div>
                <div className="w-full">
                    <p className={`font-semibold text-lg ${statusInfo.textColor}`}>{title}</p>
                    {logContent && <pre className="text-gray-400 text-xs mt-2 bg-gray-900/50 p-2 rounded whitespace-pre-wrap max-h-48 overflow-y-auto">{logContent}</pre>}
                    {warning && <p className="text-yellow-400 text-sm mt-2">{warning}</p>}
                    {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
                </div>
            </div>
        </div>
    );
};

const WpUsersModal = ({ users, onClose, onAdd, onEdit, onDelete }) => (
    <Modal isOpen={true} onClose={onClose} title="Usuários WordPress">
        <div className="mb-4">
            <button onClick={onAdd} className="bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700">
                Adicionar Novo Usuário
            </button>
        </div>
        <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-sm text-left text-gray-400">
                <thead className="text-xs text-gray-300 uppercase bg-gray-700">
                    <tr>
                        <th scope="col" className="px-6 py-3">ID</th>
                        <th scope="col" className="px-6 py-3">Login</th>
                        <th scope="col" className="px-6 py-3">Email</th>
                        <th scope="col" className="px-6 py-3">Role</th>
                        <th scope="col" className="px-6 py-3">Ações</th>
                    </tr>
                </thead>
                <tbody>
                    {users.map((user) => (
                        <tr key={user.ID} className="bg-gray-800 border-b border-gray-700">
                            <td className="px-6 py-4">{user.ID}</td>
                            <td className="px-6 py-4">{user.user_login}</td>
                            <td className="px-6 py-4">{user.user_email}</td>
                            <td className="px-6 py-4">{user.roles}</td>
                            <td className="px-6 py-4">
                                <button onClick={() => onEdit(user)} className="font-medium text-blue-500 hover:underline mr-4">Editar</button>
                                <button onClick={() => onDelete(user)} className="font-medium text-red-500 hover:underline">Deletar</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
        <div className="flex justify-end mt-4">
            <button onClick={onClose} className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700">
                Fechar
            </button>
        </div>
    </Modal>
);

const SiteListItem = ({ site, onManageUsers, onInstallSsl, onDeleteSite, isJobRunning }) => (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 flex items-center justify-between">
        <span className="font-semibold text-lg text-white">{site}</span>
        <div className="flex items-center gap-3">
            <a href={`https://${site}/wp-admin`} target="_blank" rel="noopener noreferrer" className={`text-sm bg-blue-600 text-white py-2 px-3 rounded-md hover:bg-blue-700 transition-colors ${isJobRunning ? 'opacity-50 cursor-not-allowed' : ''}`}>
                Painel WP
            </a>
            <button onClick={onManageUsers} disabled={isJobRunning} className="text-sm bg-gray-600 text-white py-2 px-3 rounded-md hover:bg-gray-500 disabled:opacity-50 transition-colors">
                Usuários
            </button>
            {/* Ações do Site Dropdown */}
            <div className="relative">
                 <select disabled={isJobRunning} onChange={(e) => {
                     if (e.target.value === 'ssl') onInstallSsl();
                     if (e.target.value === 'delete') onDeleteSite();
                     e.target.value = ''; // Reset select
                 }} className="text-sm bg-gray-600 text-white py-2 px-3 rounded-md hover:bg-gray-500 disabled:opacity-50 transition-colors appearance-none cursor-pointer">
                    <option value="" disabled selected>Ações</option>
                    <option value="ssl">Instalar/Renovar SSL</option>
                    <option value="delete">Deletar Site</option>
                </select>
            </div>
        </div>
    </div>
);

const SiteList = ({ sites, onManageUsers, onInstallSsl, onDeleteSite, isJobRunning }) => (
    <div className="space-y-4">
        <h2 className="text-2xl font-bold tracking-tighter text-white">Sites Instalados</h2>
        {sites.length > 0 ? (
            sites.map(site => (
                <SiteListItem 
                    key={site} 
                    site={site} 
                    onManageUsers={() => onManageUsers(site)}
                    onInstallSsl={() => onInstallSsl(site)}
                    onDeleteSite={() => onDeleteSite(site)}
                    isJobRunning={isJobRunning}
                />
            ))
        ) : (
            <p className="text-gray-500">Nenhum site WordPress instalado nesta VPS.</p>
        )}
    </div>
);


const DeleteSiteModal = ({ site, onConfirm, onCancel }) => {
    const [confirmationText, setConfirmationText] = useState('');
    const isConfirmed = confirmationText === site;

    return (
        <Modal isOpen={true} onClose={onCancel} title="Confirmar Exclusão do Site">
            <p className="text-gray-300 mb-4">Esta ação é irreversível. O site <strong>{site}</strong> e seu banco de dados serão permanentemente removidos.</p>
            <p className="text-gray-300 mb-4">Para confirmar, digite <strong>{site}</strong> no campo abaixo.</p>
            <InputField
                id="delete-confirm"
                type="text"
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                placeholder={site}
            />
            <div className="flex justify-end items-center gap-4 mt-6">
                <button type="button" onClick={onCancel} className="text-gray-400 hover:text-white">Cancelar</button>
                <button 
                    type="button" 
                    onClick={() => onConfirm(site)} 
                    disabled={!isConfirmed} 
                    className="bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 disabled:bg-gray-500 disabled:cursor-not-allowed"
                >
                    Excluir Permanentemente
                </button>
            </div>
        </Modal>
    );
};


const VpsControlPanel = ({ vps, onBack, onVpsDeleted }) => {
    const [woStatus, setWoStatus] = useState<'checking' | 'installed' | 'not-installed'>('checking');
    const [sites, setSites] = useState<string[]>([]);
    const [sitesLoading, setSitesLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [modalState, setModalState] = useState({ type: '', isOpen: false });
    
    const [activeJob, setActiveJob] = useState<{ action: string, title: string; status: 'running' | 'completed' | 'failed'; logFileName?: string; pidFileName?: string; logContent?: string; error?: string; warning?: string; } | null>(null);
    const pollingRef = useRef<number | null>(null);

    const [wpUsers, setWpUsers] = useState<any[]>([]);
    const [userMgmtView, setUserMgmtView] = useState<'select_site' | 'loading' | 'user_list' | 'add_user' | 'edit_user' | 'confirm_delete'>('select_site');
    const [currentUserDomain, setCurrentUserDomain] = useState<string | null>(null);
    const [userToDelete, setUserToDelete] = useState<any | null>(null);
    const [userToEdit, setUserToEdit] = useState<any | null>(null);
    const [siteToDelete, setSiteToDelete] = useState<string | null>(null);

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

        // 1. Check for the specific SSL DNS warning
        if (job.action === 'install-ssl-site' && finalLog.includes("Aborting SSL certificate issuance")) {
            finalStatus = 'completed';
            finalTitle = 'Instalação de SSL com Aviso';
            finalWarning = 'A instalação do SSL falhou porque o DNS não aponta para o servidor. Corrija o DNS e tente novamente.';
        
        // 2. Check for the specific Site Creation DNS warning
        } else if (job.action === 'create-wordpress-site' && finalLog.includes("Aborting SSL certificate issuance")) {
            finalStatus = 'completed';
            finalTitle = 'Site Criado com Aviso';
            finalWarning = 'Site criado, mas o SSL falhou. Aponte o DNS do domínio para o IP do servidor e instale o SSL pelo painel.';
        
        // 3. Check for generic failure (includes 'aborting' for other cases)
        } else if (finalLog.toLowerCase().includes('fail') || finalLog.toLowerCase().includes('error') || finalLog.toLowerCase().includes('aborting')) {
            finalStatus = 'failed';
            finalTitle = `Falha: ${job.title}`;
            finalError = 'A operação falhou. Verifique os logs para mais detalhes.';

        // 4. If none of the above, assume success
        } else {
            finalStatus = 'completed';
            finalTitle = `${job.title} concluído!`;
        }

        setActiveJob(prev => prev ? { ...prev, status: finalStatus, title: finalTitle, error: finalError, warning: finalWarning } : null);
        
        // Only refetch on true success (no warnings, no errors)
        const shouldRefetchSites = (job.action.includes('site') || job.action.includes('wordops')) && finalStatus === 'completed' && !finalWarning;
        
        if (shouldRefetchSites) {
            fetchSites();
        }

        if (job.action.includes('wp-user') && finalStatus === 'completed' && !finalWarning) {
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
    }, [vps.id, currentUserDomain]);


    useEffect(() => {
        if (activeJob?.status === 'running' && activeJob.logFileName && activeJob.pidFileName && !pollingRef.current) {
            pollingRef.current = setInterval(() => {
                pollJobStatus(activeJob);
            }, 3000);
        }
        return () => stopPolling();
    }, [activeJob, pollJobStatus]);


    const startAction = async ({ action, params, title }) => {
        setModalState({ type: '', isOpen: false });
        setSiteToDelete(null);
        setUserMgmtView('select_site');
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
        setModalState({ type: 'manage-wp-users', isOpen: true });
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
            setUserMgmtView('select_site'); // Go back to selection on error
            setModalState({ type: '', isOpen: false });
        }
    };

    const renderUserManagementContent = () => {
        switch (userMgmtView) {
            case 'loading':
                return <div className="text-center p-8"><LoadingSpinner /></div>;
            case 'user_list':
                return (
                    <WpUsersModal
                        users={wpUsers}
                        onClose={() => setModalState({ type: '', isOpen: false })}
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
              return null; // Should not happen as we now open the modal and go straight to loading
        }
    };

    const renderPanelContent = () => {
        if (woStatus === 'checking') return <div className="text-center"><LoadingSpinner /> <p className="mt-4">Verificando status do WordOps...</p></div>;
        if (error) return <div className="text-center text-red-500 bg-red-900/20 p-4 rounded-md"><strong>Erro:</strong> {error}</div>;
        
        const isJobRunning = activeJob?.status === 'running';

        if (woStatus === 'installed') {
            return (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-1">
                    <h2 className="text-2xl font-bold tracking-tighter text-white mb-4">Ações</h2>
                    <ActionCard title="Instalar Site WordPress" onClick={() => setModalState({ type: 'create-site', isOpen: true })} loading={isJobRunning} />
                </div>
                <div className="md:col-span-2">
                    {sitesLoading ? (
                        <div className="text-center"><LoadingSpinner /> <p className="mt-4">Carregando sites instalados...</p></div>
                    ) : (
                        <SiteList 
                            sites={sites}
                            isJobRunning={isJobRunning}
                            onManageUsers={(site) => handleGetUsers({ domain: site })}
                            onInstallSsl={(site) => startAction({ action: 'install-ssl-site', params: { domain: site }, title: `Instalando SSL em ${site}` })}
                            onDeleteSite={(site) => setSiteToDelete(site)}
                        />
                    )}
                </div>
              </div>
            );
        }
        if (woStatus === 'not-installed') {
            return (
              <div className="max-w-sm mx-auto">
                  <ActionCard title="Instalar WordOps" onClick={() => { if(window.confirm('Isso iniciará a instalação do WordOps. Pode levar vários minutos. Continuar?')) startAction({ action: 'install-wordops', params: {}, title: 'Instalando WordOps' })}} loading={isJobRunning} />
              </div>
            );
        }
        return null;
    };

    return (
        <div className="px-4 md:px-16 py-8 animate-fade-in">
            <button onClick={onBack} className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 mb-8">
                <ArrowLeftIcon className="w-5 h-5" />
                Voltar para a Lista de VPS
            </button>
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-4xl font-bold tracking-tighter">Painel da VPS</h1>
                    <p className="text-gray-400 text-lg">{vps.host}</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => onVpsDeleted()} className="text-sm bg-red-600 text-white py-2 px-3 rounded-md hover:bg-red-700 transition-colors">
                        Deletar VPS
                    </button>
                    {woStatus === 'installed' && <CheckCircleIcon />}
                    {woStatus === 'not-installed' && <XCircleIcon />}
                    <span className="text-lg">{woStatus === 'installed' ? 'WordOps Instalado' : (woStatus === 'not-installed' ? 'WordOps Não Instalado' : 'Verificando...')}</span>
                </div>
            </div>

            {activeJob && <JobStatus {...activeJob} />}
            {renderPanelContent()}

            {modalState.isOpen && modalState.type === 'create-site' && (
                <Modal isOpen={true} onClose={() => setModalState({ type: '', isOpen: false })} title="Criar Novo Site WordPress">
                    <CreateSiteForm onSubmit={(params) => startAction({ action: 'create-wordpress-site', params, title: `Criando site ${params.domain}` })} onCancel={() => setModalState({ type: '', isOpen: false })} />
                </Modal>
            )}
            
            {/* User Management Modal */}
            {modalState.isOpen && modalState.type === 'manage-wp-users' && (
                <Modal isOpen={true} onClose={() => setModalState({ type: '', isOpen: false })} title={`Gerenciando Usuários de ${currentUserDomain}`}>
                    {renderUserManagementContent()}
                </Modal>
            )}

            {/* Site Deletion Modal */}
            {siteToDelete && (
                <DeleteSiteModal 
                    site={siteToDelete}
                    onConfirm={(site) => startAction({ action: 'delete-wordpress-site', params: { domain: site }, title: `Deletando site ${site}` })}
                    onCancel={() => setSiteToDelete(null)}
                />
            )}
        </div>
    );
};
// #endregion

// #region Main Page Component
const ManageVpsPage = () => {
  const [selectedVps, setSelectedVps] = useState<VpsData | null>(null);
  const [vpsList, setVpsList] = useState<VpsData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [vpsToEdit, setVpsToEdit] = useState<VpsData | null>(null);

  const fetchVpsList = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('get-vps-list');
      if (invokeError || data?.error) throw invokeError || new Error(JSON.stringify(data.error));
      setVpsList(data || []);
    } catch (err: any) {
      setError(err.message || 'Falha ao buscar a lista de VPS.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedVps) {
        fetchVpsList();
    }
  }, [fetchVpsList, selectedVps]);

  const handleVpsAdded = () => { fetchVpsList(); setIsAddModalOpen(false); };
  const handleVpsUpdated = () => { fetchVpsList(); setIsEditModalOpen(false); setVpsToEdit(null); };

  const handleEditVps = (vps: VpsData) => {
    setVpsToEdit(vps);
    setIsEditModalOpen(true);
  };

  const handleDeleteVps = async (vpsId: number) => {
    if (window.confirm('Tem certeza que deseja deletar este VPS? Esta ação não pode ser desfeita.')) {
      try {
        const { data, error: invokeError } = await supabase.functions.invoke('delete-vps-credentials', { body: { id: vpsId } });
        if (invokeError || data?.error) throw invokeError || new Error(JSON.stringify(data.error));
        fetchVpsList();
      } catch (err: any) {
        alert(`Falha ao deletar o VPS: ${err.message}`);
      }
    }
  };

  const renderListView = () => {
    if (loading) return <p className="text-center py-10">Carregando seus VPSs...</p>;
    if (error) return <p className="text-center text-red-500 py-10">{error}</p>;
    return (
      <div className="px-4 md:px-16 py-8 animate-fade-in">
        <div className="flex justify-between items-center mb-8"><h1 className="text-4xl font-bold tracking-tighter">Gerenciar VPS</h1></div>
        <div className="relative mb-8">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><SearchIcon /></div>
            <input type="text" placeholder="Procurar por host..." className="w-full bg-gray-900 border border-gray-700 rounded-md py-3 pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <div className="bg-gray-800/50 border-2 border-dashed border-gray-600 rounded-lg flex flex-col items-center justify-center p-6 cursor-pointer hover:bg-gray-800 hover:border-gray-500 transition-colors h-full min-h-[200px]" onClick={() => setIsAddModalOpen(true)}>
            <PlusIcon />
            <h3 className="text-lg font-semibold text-white mt-4">Adicionar Novo VPS</h3>
            <p className="text-sm text-gray-500">Conectar um novo servidor</p>
          </div>
          {vpsList.filter(vps => vps.host.toLowerCase().includes(searchTerm.toLowerCase())).map(vps => (
            <div key={vps.id} onClick={() => setSelectedVps(vps)}>
                <VpsCard vps={vps} onDelete={() => handleDeleteVps(vps.id)} onEdit={() => handleEditVps(vps)} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="pt-24 bg-[#141414] min-h-screen text-white">
      {selectedVps ? (
        <VpsControlPanel vps={selectedVps} onBack={() => setSelectedVps(null)} onVpsDeleted={() => { setSelectedVps(null); fetchVpsList(); }} />
      ) : (
        renderListView()
      )}
      
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Adicionar Novo VPS">
        <AddVpsForm onVpsAdded={handleVpsAdded} onCancel={() => setIsAddModalOpen(false)} />
      </Modal>
      {vpsToEdit && (
        <Modal isOpen={isEditModalOpen} onClose={() => { setIsEditModalOpen(false); setVpsToEdit(null); }} title="Editar VPS">
            <EditVpsForm vps={vpsToEdit} onVpsUpdated={handleVpsUpdated} onCancel={() => { setIsEditModalOpen(false); setVpsToEdit(null); }} />
        </Modal>
      )}
    </div>
  );
};

const AddVpsForm = ({ onVpsAdded, onCancel }) => {
    const [host, setHost] = useState('');
    const [port, setPort] = useState(22);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
  
    const handleSaveVps = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      setMessage('');
      setError('');
      try {
        const { data, error: invokeError } = await supabase.functions.invoke('save-vps-credentials', {
          body: { host, port, username, password },
        });
        if (invokeError || data?.error) throw invokeError || new Error(JSON.stringify(data.error));
        setMessage(data.message || 'VPS salvo com sucesso!');
        setTimeout(() => onVpsAdded(), 1500);
      } catch (err: any) {
        setError(err.message || 'Ocorreu um erro inesperado.');
      } finally {
        setLoading(false);
      }
    };
  
    return (
      <form onSubmit={handleSaveVps}>
        <InputField label="Host" id="host" type="text" value={host} onChange={(e) => setHost(e.target.value)} required />
        <InputField label="Port" id="port" type="number" value={port} onChange={(e) => setPort(parseInt(e.target.value))} required />
        <InputField label="Username" id="username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} required />
        <InputField label="Password" id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <div className="flex justify-end items-center gap-4 mt-6">
          <button type="button" onClick={onCancel} className="text-gray-400 hover:text-white">Cancelar</button>
          <button type="submit" disabled={loading} className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-500">
            {loading ? 'Testando e Salvando...' : 'Salvar VPS'}
          </button>
        </div>
        {message && <p className="mt-4 text-green-500 text-center">{message}</p>}
        {error && <p className="mt-4 text-red-500 text-center">{error}</p>}
      </form>
    );
};
  
const EditVpsForm = ({ vps, onVpsUpdated, onCancel }) => {
    const [host, setHost] = useState(vps.host);
    const [port, setPort] = useState(vps.port);
    const [username, setUsername] = useState(vps.username);
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
  
    const handleUpdateVps = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      setMessage('');
      setError('');
      try {
        const { data, error: invokeError } = await supabase.functions.invoke('update-vps-credentials', {
          body: { id: vps.id, host, port, username, password },
        });
        if (invokeError || data?.error) throw invokeError || new Error(JSON.stringify(data.error));
        setMessage(data.message || 'VPS atualizado com sucesso!');
        setTimeout(() => onVpsUpdated(), 1500);
      } catch (err: any) {
        setError(err.message || 'Ocorreu um erro inesperado.');
      } finally {
        setLoading(false);
      }
    };
  
    return (
      <form onSubmit={handleUpdateVps}>
        <InputField label="Host" id="host" type="text" value={host} onChange={(e) => setHost(e.target.value)} required />
        <InputField label="Port" id="port" type="number" value={port} onChange={(e) => setPort(parseInt(e.target.value))} required />
        <InputField label="Username" id="username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} required />
        <InputField label="New Password (optional)" id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <div className="flex justify-end items-center gap-4 mt-6">
          <button type="button" onClick={onCancel} className="text-gray-400 hover:text-white">Cancelar</button>
          <button type="submit" disabled={loading} className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-500">
            {loading ? 'Atualizando...' : 'Atualizar VPS'}
          </button>
        </div>
        {message && <p className="mt-4 text-green-500 text-center">{message}</p>}
        {error && <p className="mt-4 text-red-500 text-center">{error}</p>}
      </form>
    );
};

export default ManageVpsPage;
