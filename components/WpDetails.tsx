import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../src/supabaseClient';
import { WpData } from './WpCard';
import { VpsData } from './VpsCard';
import { AddIcon, DocumentTextIcon, EyeIcon, TrashIcon, PencilIcon, UsersIcon, LoadingSpinner } from './Icons';
import Modal from './Modal';
import WpUsersModal from './vps/modals/WpUsersModal';
import AddWpUserForm from './vps/modals/AddWpUserForm';
import EditWpUserForm from './vps/modals/EditWpUserForm';
import DeleteWpUserModal from './vps/modals/DeleteWpUserModal';

const OverviewCard = ({ title, value, subtitle, loading }) => (
    <div className="bg-gray-800/50 p-6 rounded-lg border border-white/10">
        <h4 className="text-sm font-medium text-gray-400 mb-2">{title}</h4>
        {loading ? <div className="h-8 bg-gray-700 rounded w-3/4 animate-pulse"></div> : <p className="text-3xl font-bold text-white">{value}</p>}
        {subtitle && !loading && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
    </div>
);

const CreateArticleForm = ({ site, onArticleCreated, onArticleUpdated, onCancel }) => {
    // ... form logic from before ...
    return (
        <form> {/* ... form JSX from before ... */} </form>
    );
};

const WpDetails = ({ site, vps, onBack }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [overviewData, setOverviewData] = useState<any>(null);
  const [articles, setArticles] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [isCreateArticleModalOpen, setIsCreateArticleModalOpen] = useState(false);

  // --- User Management State & Logic ---
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [wpUsers, setWpUsers] = useState<any[]>([]);
  const [userMgmtView, setUserMgmtView] = useState('user_list');
  const [userToDelete, setUserToDelete] = useState<any | null>(null);
  const [userToEdit, setUserToEdit] = useState<any | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(false);

  const startUserAction = async ({ action, params, title }) => {
    if (!vps) return;
    setIsUserModalOpen(false); // Close the main modal, job status will appear
    // Here you would call the REAL Supabase function to start a long action
    // This is a simplified version. The real one is in VpsControlPanel
    console.log("Starting user action:", { vpsId: vps.id, action, params, title });
    alert(`Ação '${title}' iniciada. Acompanhe o status no painel da VPS.`);
  };
  
  const handleGetUsers = useCallback(async () => {
    if (!vps) {
      setError("A VPS associada a este site não foi encontrada, não é possível gerenciar usuários.");
      return;
    }
    setIsUserLoading(true);
    setError('');
    try {
        const { data, error: invokeError } = await supabase.functions.invoke('get-wp-users', { body: { vpsId: vps.id, domain: site.site_url }});
        if (invokeError || (data && data.error)) throw invokeError || new Error(JSON.stringify(data.error));
        setWpUsers(data.users || []);
    } catch (err: any) {
        setError(`Falha ao buscar usuários: ${err.message}`);
    } finally {
        setIsUserLoading(false);
    }
  }, [vps, site.site_url]);

  useEffect(() => {
    if (isUserModalOpen && userMgmtView === 'user_list') {
      handleGetUsers();
    }
  }, [isUserModalOpen, userMgmtView, handleGetUsers]);

  const renderUserManagementContent = () => {
    if (isUserLoading) return <div className="text-center p-8"><LoadingSpinner /></div>;
    
    switch (userMgmtView) {
        case 'user_list': return <WpUsersModal users={wpUsers} onClose={() => setIsUserModalOpen(false)} onAdd={() => setUserMgmtView('add_user')} onEdit={(user) => { setUserToEdit(user); setUserMgmtView('edit_user'); }} onDelete={(user) => { setUserToDelete(user); setUserMgmtView('confirm_delete'); }} />;
        case 'add_user': return <AddWpUserForm domain={site.site_url} onSubmit={(params) => startUserAction({ action: 'create-wp-user', params, title: `Criando usuário ${params.username}` })} onCancel={() => setUserMgmtView('user_list')} />;
        case 'edit_user': return <EditWpUserForm user={userToEdit} domain={site.site_url} onSubmit={(params) => startUserAction({ action: 'update-wp-user', params, title: `Atualizando usuário` })} onCancel={() => setUserMgmtView('user_list')} />;
        case 'confirm_delete': return <DeleteWpUserModal user={userToDelete} onConfirm={(user) => startUserAction({ action: 'delete-wp-user', params: { domain: site.site_url, userId: user.ID }, title: `Deletando usuário ${user.user_login}` })} onCancel={() => setUserMgmtView('user_list')} />;
        default: return null;
    }
  };
  // --- End of User Management ---

  const handleDeleteArticle = async (postId) => { /* ... */ };
  const handleArticleCreated = (tempArticle) => { /* ... */ };
  const handleArticleUpdated = (tempId, realArticle) => { /* ... */ };
  
  const fetchSiteData = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const { data: overview, error: overviewError } = await supabase.functions.invoke('get-wp-site-overview', { body: { siteId: site.id } });
      if (overviewError) throw overviewError;
      setOverviewData(overview);
      const { data: articles, error: articlesError } = await supabase.functions.invoke('get-wp-site-articles', { body: { siteId: site.id } });
      if (articlesError) throw articlesError;
      setArticles(articles);
    } catch (err: any) {
      setError(err.message || 'Falha ao buscar dados do site.');
    } finally {
      setIsLoading(false);
    }
  }, [site.id]);

  useEffect(() => {
    fetchSiteData();
  }, [fetchSiteData]);

  if (isLoading && articles.length === 0) { /* ... */ }

  return (
    <div className="animate-fade-in space-y-8">
      <div>
        <button onClick={onBack} className="mb-6 text-blue-400 hover:text-blue-300">← Voltar para a lista</button>
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-3xl font-bold mb-2">Gerenciando: {site.site_url}</h2>
          <p className="text-gray-400">Usuário: {site.wp_username}</p>
        </div>
      </div>

      <div className="mb-8">
          <h3 className="text-2xl font-semibold mb-4">Visão Geral</h3>
          {/* ... Overview Cards */}
      </div>

      {/* --- Users Section --- */}
      {vps && (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-2xl font-semibold">Usuários do Site</h3>
                <button onClick={() => { setUserMgmtView('user_list'); setIsUserModalOpen(true); }} className="bg-gray-700 text-white py-2 px-4 rounded-md hover:bg-gray-600 flex items-center gap-2">
                    <UsersIcon className="w-5 h-5" />
                    Gerenciar Usuários
                </button>
            </div>
            <div className="bg-gray-800/50 rounded-lg border border-white/10 p-6">
                <p className="text-gray-400">Clique em "Gerenciar Usuários" para ver, adicionar, editar ou remover usuários deste site diretamente no servidor.</p>
            </div>
        </div>
      )}
      
      <div>
        {/* ... Articles Section */}
      </div>

      {/* --- Modals --- */}
      <Modal isOpen={isUserModalOpen} onClose={() => setIsUserModalOpen(false)} title={`Gerenciando Usuários de ${site.site_url}`}>
          {renderUserManagementContent()}
      </Modal>
      <Modal isOpen={isCreateArticleModalOpen} onClose={() => setIsCreateArticleModalOpen(false)} title="Criar Novo Artigo com IA">
        <CreateArticleForm site={site} onArticleCreated={handleArticleCreated} onArticleUpdated={handleArticleUpdated} onCancel={() => setIsCreateArticleModalOpen(false)} />
      </Modal>
    </div>
  );
};

export default WpDetails;