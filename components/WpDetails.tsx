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

// ... (CreateArticleForm e OverviewCard permanecem os mesmos)

const WpDetails = ({ site, vps, onBack }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [overviewData, setOverviewData] = useState<any>(null);
  const [articles, setArticles] = useState<any[]>([]);
  const [error, setError] = useState('');

  // --- User Management State & Logic ---
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [wpUsers, setWpUsers] = useState<any[]>([]);
  const [userMgmtView, setUserMgmtView] = useState('user_list');
  const [userToDelete, setUserToDelete] = useState<any | null>(null);
  const [userToEdit, setUserToEdit] = useState<any | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(false);

  const startUserAction = async ({ action, params, title }) => {
    // Similar to startAction in VpsControlPanel, but may need adjustments
    // For now, let's just log it
    console.log("Starting user action:", { action, params, title });
    // Here you would call the Supabase function, e.g., 'create-wp-user'
    // using the vps.id if available.
  };

  const handleGetUsers = async () => {
    if (!vps) {
      alert("A VPS associada a este site não foi encontrada. Não é possível gerenciar usuários.");
      return;
    }
    setIsUserLoading(true);
    setError('');
    try {
        const { data, error: invokeError } = await supabase.functions.invoke('get-wp-users', { body: { vpsId: vps.id, domain: site.site_url }});
        if (invokeError || data.error) throw invokeError || new Error(JSON.stringify(data.error));
        setWpUsers(data.users || []);
    } catch (err: any) {
        setError(`Falha ao buscar usuários: ${err.message}`);
    } finally {
        setIsUserLoading(false);
    }
  };

  useEffect(() => {
    if (isUserModalOpen && userMgmtView === 'user_list') {
      handleGetUsers();
    }
  }, [isUserModalOpen, userMgmtView]);

  const renderUserManagementContent = () => {
    if (isUserLoading) return <div className="text-center p-8"><LoadingSpinner /></div>;
    
    switch (userMgmtView) {
        case 'user_list': 
            return <WpUsersModal users={wpUsers} onClose={() => setIsUserModalOpen(false)} onAdd={() => setUserMgmtView('add_user')} onEdit={(user) => { setUserToEdit(user); setUserMgmtView('edit_user'); }} onDelete={(user) => { setUserToDelete(user); setUserMgmtView('confirm_delete'); }} />;
        case 'add_user': 
            return <AddWpUserForm domain={site.site_url} onSubmit={(params) => startUserAction({ action: 'create-wp-user', params, title: `Criando usuário ${params.username}` })} onCancel={() => setUserMgmtView('user_list')} />;
        case 'edit_user': 
            return <EditWpUserForm user={userToEdit} domain={site.site_url} onSubmit={(params) => startUserAction({ action: 'update-wp-user', params, title: `Atualizando usuário` })} onCancel={() => setUserMgmtView('user_list')} />;
        case 'confirm_delete': 
            return <DeleteWpUserModal user={userToDelete} onConfirm={(user) => startUserAction({ action: 'delete-wp-user', params: { domain: site.site_url, userId: user.ID }, title: `Deletando usuário ${user.user_login}` })} onCancel={() => setUserMgmtView('user_list')} />;
        default: return null;
    }
  };
  // --- End of User Management ---

  // ... (handleDeleteArticle, handleArticleCreated, etc.)

  const fetchSiteData = async () => {
    // ...
  };

  useEffect(() => {
    fetchSiteData();
  }, [site.id]);

  // ... (loading and main return)
  
  return (
    <div className="animate-fade-in">
      {/* ... (Header and Overview) */}
      
      {/* --- Users Section --- */}
      {vps && (
        <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-2xl font-semibold">Usuários do Site</h3>
                <button onClick={() => setIsUserModalOpen(true)} className="bg-gray-700 text-white py-2 px-4 rounded-md hover:bg-gray-600 flex items-center gap-2">
                    <UsersIcon className="w-5 h-5" />
                    Gerenciar Usuários
                </button>
            </div>
            <div className="bg-gray-800/50 rounded-lg border border-white/10 p-6">
                <p className="text-gray-400">Clique em "Gerenciar Usuários" para ver, adicionar, editar ou remover usuários deste site diretamente no servidor.</p>
            </div>
        </div>
      )}

      {/* --- Articles Section --- */}
      <div>
        {/* ... (articles table) */}
      </div>

      {/* --- Modals --- */}
      <Modal isOpen={isUserModalOpen} onClose={() => setIsUserModalOpen(false)} title={`Gerenciando Usuários de ${site.site_url}`}>
          {renderUserManagementContent()}
      </Modal>
      
      {/* ... (other modals) */}
    </div>
  );
};

export default WpDetails;