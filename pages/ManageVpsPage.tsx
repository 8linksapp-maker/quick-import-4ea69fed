
import React, { useState, useEffect, useCallback } from 'react';
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
            <button onClick={onClose} className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700">Fechar</button>
        </div>
    </Modal>
);

const CreateSiteForm = ({ vpsId, onActionComplete, onCancel }) => {
    const [domain, setDomain] = useState('');
    const [user, setUser] = useState('admin');
    const [pass, setPass] = useState('');
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
  
    const handleCreateSite = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      setError('');
      try {
        const { data, error: invokeError } = await supabase.functions.invoke('create-wordpress-site', {
          body: { vpsId, domain, user, pass, email },
        });
        if (invokeError) throw invokeError;
        if (data.error) throw new Error(data.error);
        onActionComplete(data.stdout || 'Comando executado, mas não houve output.');
      } catch (err: any) {
        setError(err.message || 'Ocorreu um erro inesperado.');
      } finally {
        setLoading(false);
      }
    };
  
    return (
      <form onSubmit={handleCreateSite}>
        <InputField label="Domínio" id="domain" type="text" value={domain} onChange={(e) => setDomain(e.target.value)} required />
        <InputField label="Usuário WP" id="user" type="text" value={user} onChange={(e) => setUser(e.target.value)} required />
        <InputField label="Senha WP" id="pass" type="password" value={pass} onChange={(e) => setPass(e.target.value)} required />
        <InputField label="Email WP" id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <div className="flex justify-end items-center gap-4 mt-6">
          <button type="button" onClick={onCancel} className="text-gray-400 hover:text-white">Cancelar</button>
          <button type="submit" disabled={loading} className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-500">
            {loading ? 'Criando Site...' : 'Criar Site'}
          </button>
        </div>
        {error && <p className="mt-4 text-red-500 text-center">{error}</p>}
      </form>
    );
};

const InstallSslForm = ({ vpsId, sites, onActionComplete, onCancel }) => {
    const [domain, setDomain] = useState(sites[0] || '');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleInstallSsl = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const { data, error: invokeError } = await supabase.functions.invoke('install-ssl-site', {
                body: { vpsId, domain },
            });
            if (invokeError) throw invokeError;
            if (data.error) throw new Error(data.error);
            onActionComplete(data.stdout || 'Comando executado, mas não houve output.');
        } catch (err: any) {
            setError(err.message || 'Ocorreu um erro inesperado.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleInstallSsl}>
            <label htmlFor="sslDomain" className="block text-sm font-medium text-gray-300 mb-2">Selecione o Site</label>
            <select id="sslDomain" value={domain} onChange={(e) => setDomain(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                {sites.map(site => <option key={site} value={site}>{site}</option>)}
            </select>
            <div className="flex justify-end items-center gap-4 mt-6">
                <button type="button" onClick={onCancel} className="text-gray-400 hover:text-white">Cancelar</button>
                <button type="submit" disabled={loading || !domain} className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-500">
                    {loading ? 'Instalando SSL...' : 'Instalar SSL'}
                </button>
            </div>
            {error && <p className="mt-4 text-red-500 text-center">{error}</p>}
        </form>
    );
};

const ManageWpUsersForm = ({ vpsId, sites, onActionComplete, onCancel }) => {
    const [domain, setDomain] = useState(sites[0] || '');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleGetWpUsers = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const { data, error: invokeError } = await supabase.functions.invoke('get-wp-users', {
                body: { vpsId, domain },
            });
            if (invokeError) throw invokeError;
            if (data.error) throw new Error(data.error);
            onActionComplete(JSON.stringify(data.users || data, null, 2));
        } catch (err: any) {
            setError(err.message || 'Ocorreu um erro inesperado.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleGetWpUsers}>
            <label htmlFor="wpUserDomain" className="block text-sm font-medium text-gray-300 mb-2">Selecione o Site</label>
            <select id="wpUserDomain" value={domain} onChange={(e) => setDomain(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                {sites.map(site => <option key={site} value={site}>{site}</option>)}
            </select>
            <div className="flex justify-end items-center gap-4 mt-6">
                <button type="button" onClick={onCancel} className="text-gray-400 hover:text-white">Cancelar</button>
                <button type="submit" disabled={loading || !domain} className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-500">
                    {loading ? 'Buscando Usuários...' : 'Listar Usuários'}
                </button>
            </div>
            {error && <p className="mt-4 text-red-500 text-center">{error}</p>}
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

const ActionCard = ({ title, onClick, loading = false }) => (
    <div 
      className="bg-gray-800 border border-gray-700 rounded-lg p-6 text-center cursor-pointer hover:bg-gray-700 hover:border-blue-500 transition-colors"
      onClick={!loading ? onClick : undefined}
    >
      <div className="flex flex-col items-center justify-center h-full">
        {loading ? <LoadingSpinner /> : <CubeIcon className="w-10 h-10 text-blue-400 mb-4" />}
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>
    </div>
);

const VpsControlPanel = ({ vps, onBack, onVpsDeleted }) => {
    const [woStatus, setWoStatus] = useState<'checking' | 'installed' | 'not-installed'>('checking');
    const [sites, setSites] = useState<string[]>([]);
    const [sitesLoading, setSitesLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [modalState, setModalState] = useState({ type: '', isOpen: false });
    const [output, setOutput] = useState('');

    const fetchSites = useCallback(async () => {
        setSitesLoading(true);
        try {
            const { data, error: invokeError } = await supabase.functions.invoke('get-installed-sites', { body: { vpsId: vps.id } });
            if (invokeError) throw invokeError;
            if (data.error) throw new Error(data.error);
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
          if (invokeError) throw invokeError;
          if (data.error) throw new Error(data.error);
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

    const handleAction = async (action: string, params: any = {}) => {
        setActionLoading(action);
        setError(null);
        try {
            const { data, error: invokeError } = await supabase.functions.invoke(action, { body: { vpsId: vps.id, ...params } });
            if (invokeError) throw invokeError;
            if (data.error) throw new Error(data.error);
            
            let outputString = 'Ação concluída com sucesso.';
            if (data.stdout) outputString = data.stdout;
            else if (data.users) outputString = JSON.stringify(data.users, null, 2);
            else if (data.message) outputString = data.message;
            else if (Object.keys(data).length > 0) outputString = JSON.stringify(data, null, 2);

            setOutput(outputString);

            if (action === 'delete-vps-credentials') {
                onVpsDeleted();
            }
        } catch (err: any) {
            setOutput(`Erro ao executar a ação: ${err.message}`);
        } finally {
            setActionLoading(null);
            setModalState({ type: '', isOpen: false });
            if (action === 'install-wordops') checkWoStatus();
        }
    };

    const renderPanelContent = () => {
        if (woStatus === 'checking') {
            return <div className="text-center"><LoadingSpinner /> <p className="mt-4">Verificando status do WordOps...</p></div>;
        }
        if (error) {
            return <div className="text-center text-red-500 bg-red-900/20 p-4 rounded-md"><strong>Erro:</strong> {error}</div>;
        }
        if (woStatus === 'installed') {
            if (sitesLoading) {
                return <div className="text-center"><LoadingSpinner /> <p className="mt-4">Carregando sites instalados...</p></div>;
            }
            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <ActionCard title="Instalar Site WordPress" onClick={() => setModalState({ type: 'create-site', isOpen: true })} />
                <ActionCard title="Instalar SSL em um Site" onClick={() => setModalState({ type: 'install-ssl', isOpen: true })} />
                <ActionCard title="Gerenciar Usuários WP" onClick={() => setModalState({ type: 'manage-wp-users', isOpen: true })} />
                <ActionCard title="Deletar VPS" onClick={() => setModalState({ type: 'delete-vps', isOpen: true })} loading={actionLoading === 'delete-vps-credentials'} />
              </div>
            );
        }
        if (woStatus === 'not-installed') {
            return (
              <div className="max-w-sm mx-auto">
                  <ActionCard title="Instalar WordOps" onClick={() => { if(window.confirm('Isso iniciará a instalação do WordOps. Pode levar vários minutos. Continuar?')) handleAction('install-wordops')}} loading={actionLoading === 'install-wordops'} />
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
                    {woStatus === 'installed' && <CheckCircleIcon />}
                    {woStatus === 'not-installed' && <XCircleIcon />}
                    <span className="text-lg">{woStatus === 'installed' ? 'WordOps Instalado' : (woStatus === 'not-installed' ? 'WordOps Não Instalado' : 'Verificando...')}</span>
                </div>
            </div>
            {renderPanelContent()}

            {modalState.isOpen && modalState.type === 'create-site' && (
                <Modal isOpen={true} onClose={() => setModalState({ type: '', isOpen: false })} title="Criar Novo Site WordPress">
                    <CreateSiteForm vpsId={vps.id} onActionComplete={(out) => { setOutput(out); setModalState({ type: '', isOpen: false }); }} onCancel={() => setModalState({ type: '', isOpen: false })} />
                </Modal>
            )}
            {modalState.isOpen && modalState.type === 'install-ssl' && (
                <Modal isOpen={true} onClose={() => setModalState({ type: '', isOpen: false })} title="Instalar SSL em um Site">
                    <InstallSslForm vpsId={vps.id} sites={sites} onActionComplete={(out) => { setOutput(out); setModalState({ type: '', isOpen: false }); }} onCancel={() => setModalState({ type: '', isOpen: false })} />
                </Modal>
            )}
            {modalState.isOpen && modalState.type === 'manage-wp-users' && (
                <Modal isOpen={true} onClose={() => setModalState({ type: '', isOpen: false })} title="Gerenciar Usuários WordPress">
                    <ManageWpUsersForm vpsId={vps.id} sites={sites} onActionComplete={(out) => { setOutput(out); setModalState({ type: '', isOpen: false }); }} onCancel={() => setModalState({ type: '', isOpen: false })} />
                </Modal>
            )}
            {modalState.isOpen && modalState.type === 'delete-vps' && (
                <DeleteVpsModal 
                    onConfirm={() => handleAction('delete-vps-credentials')}
                    onCancel={() => setModalState({ type: '', isOpen: false })}
                />
            )}
            {output && <OutputModal output={output} onClose={() => setOutput('')} />}
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
      if (invokeError) throw invokeError;
      if (data.error) throw new Error(data.error);
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
        const { error: invokeError } = await supabase.functions.invoke('delete-vps-credentials', { body: { id: vpsId } });
        if (invokeError) throw invokeError;
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
        if (invokeError) throw invokeError;
        if (data.error) throw new Error(data.error);
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
        if (invokeError) throw invokeError;
        if (data.error) throw new Error(data.error);
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
