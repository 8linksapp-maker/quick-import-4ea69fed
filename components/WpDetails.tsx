import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../src/supabaseClient';
import { WpData } from './WpCard';
import { VpsData } from './VpsCard';
import { AddIcon, DocumentTextIcon, EyeIcon, TrashIcon, PencilIcon, UsersIcon, LoadingSpinner } from './Icons';
import Modal from './Modal';
import AddWpUserForm from './vps/modals/AddWpUserForm';
import EditWpUserForm from './vps/modals/EditWpUserForm';
import DeleteWpUserModal from './vps/modals/DeleteWpUserModal';


const OverviewCard = ({ title, value, subtitle, loading }) => (
    <div className="bg-gray-800/50 p-6 rounded-lg border border-white/10">
        <h4 className="text-sm font-medium text-gray-400 mb-2">{title}</h4>
        {loading ? (
            <div className="h-8 bg-gray-700 rounded w-3/4 animate-pulse"></div>
        ) : (
            <p className="text-3xl font-bold text-white">{value}</p>
        )}
        {subtitle && !loading && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
    </div>
);

const CreateArticleForm = ({ site, onArticleCreated, onArticleUpdated, onCancel }) => {
  const [title, setTitle] = useState('');
  const [outlines, setOutlines] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        const lines = content.split('\n');
        setTitle(lines[0] || '');
        setOutlines(lines.slice(1).join('\n'));
      };
      reader.readAsText(file);
    }
  };

  const handleCreateArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const tempId = `temp_${Date.now()}`;
    const tempArticle = {
      id: tempId,
      title: { rendered: title },
      status: 'creating',
      date: new Date().toISOString(),
    };

    onArticleCreated(tempArticle);
    onCancel();

    try {
      const { data, error: invokeError } = await supabase.functions.invoke('create-informational-article', {
        body: { siteId: site.id, title, outlines },
      });

      if (invokeError) throw invokeError;
      if (data.error) throw new Error(data.error);

      onArticleUpdated(tempId, data.post);

      if (data.edit_link) {
        window.open(data.edit_link, '_blank');
      }

    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro inesperado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleCreateArticle}>
      <div className="mb-4">
        <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-2">Título do Artigo</label>
        <input type="text" id="title" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" required />
      </div>
      <div className="mb-4">
        <label htmlFor="outlines" className="block text-sm font-medium text-gray-300 mb-2">Outlines (uma por linha)</label>
        <textarea id="outlines" value={outlines} onChange={(e) => setOutlines(e.target.value)} rows={10} className="w-full bg-gray-900 border border-gray-700 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" required />
      </div>
      <div className="mb-6">
        <label htmlFor="file-upload" className="block text-sm font-medium text-gray-300 mb-2">Ou envie um arquivo .txt</label>
        <input id="file-upload" type="file" accept=".txt" onChange={handleFileChange} className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"/>
      </div>
      <div className="flex justify-end items-center gap-4 mt-6">
        <button type="button" onClick={onCancel} className="text-gray-400 hover:text-white">Cancelar</button>
        <button type="submit" disabled={loading} className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-500">
          {loading ? 'Iniciando Criação...' : 'Criar Artigo'}
        </button>
      </div>
    </form>
  );
};

const WpDetails = ({ site, vps, onBack }: { site: WpData, vps?: VpsData, onBack: () => void }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [overviewData, setOverviewData] = useState<any>(null);
  const [articles, setArticles] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [isCreateArticleModalOpen, setIsCreateArticleModalOpen] = useState(false);

  // --- User Management State ---
  const [wpUsers, setWpUsers] = useState<any[]>([]);
  const [userMgmtView, setUserMgmtView] = useState('user_list');
  const [userToDelete, setUserToDelete] = useState<any | null>(null);
  const [userToEdit, setUserToEdit] = useState<any | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(false);

  const startUserAction = async ({ action, params, title }) => {
    if (!vps) return;
    // setIsUserModalOpen(false); // Não é mais necessário, pois não estamos usando o modal principal
    alert(`Ação de usuário '${title}' iniciada. Acompanhe o status no painel da VPS.`);
    setUserMgmtView('user_list'); // Retorna para a lista após a ação
    fetchSiteData(); // Recarrega os dados para refletir as mudanças
  };
  // --- End of User Management ---

  const handleDeleteArticle = async (postId) => {
    if (window.confirm('Tem certeza que deseja deletar este artigo?')) {
      try {
        const { error } = await supabase.functions.invoke('delete-wp-site-article', {
          body: { siteId: site.id, postId },
        });
        if (error) throw error;
        setArticles(articles.filter(article => article.id !== postId));
      } catch (err: any) {
        setError(err.message || 'Falha ao deletar o artigo.');
      }
    }
  };

  const handleArticleCreated = (tempArticle) => {
    setArticles(prevArticles => [tempArticle, ...prevArticles]);
    setIsCreateArticleModalOpen(false);
  };

  const handleArticleUpdated = (tempId, realArticle) => {
    setArticles(prevArticles => 
      prevArticles.map(article => article.id === tempId ? realArticle : article)
    );
    setTimeout(() => fetchSiteData(), 3000);
  };

  const fetchSiteData = useCallback(async () => {
      setIsLoading(true);
      setError('');
      
      console.log("WpDetails received props:", { site, vps });

      const promises = [
          supabase.functions.invoke('get-wp-site-overview', { body: { siteId: site.id } }),
          supabase.functions.invoke('get-wp-site-articles', { body: { siteId: site.id } })
      ];

      if (vps) {
          console.log("Preparing to fetch users with:", { vpsId: vps.id, domain: site.site_url });
          promises.push(supabase.functions.invoke('get-wp-users', { body: { vpsId: vps.id, domain: site.site_url }}));
      }

      try {
        const [overviewResult, articlesResult, usersResult] = await Promise.all(promises);

        if (overviewResult.error) throw new Error(`Overview Error: ${JSON.stringify(overviewResult.error)}`);
        setOverviewData(overviewResult.data);

        if (articlesResult.error) throw new Error(`Articles Error: ${JSON.stringify(articlesResult.error)}`);
        setArticles(articlesResult.data || []);

        if (vps && usersResult) {
            console.log("Users Result:", usersResult);
            if (usersResult.error) throw new Error(`Users Error: ${JSON.stringify(usersResult.error)}`);
            setWpUsers(usersResult.data.users || []);
            console.log("wpUsers state set with:", usersResult.data.users);
        }

      } catch (err: any) {
        console.error("Error fetching site data:", err);
        let errorMessage = 'Falha ao buscar dados do site.';
        if (err.context && err.context.error) {
            errorMessage += ` Detalhes: ${JSON.stringify(err.context.error)}`;
        } else if (err.message) {
            errorMessage += ` Detalhes: ${err.message}`;
        }
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    }, [site.id, vps]);

  useEffect(() => {
    fetchSiteData();
  }, [fetchSiteData]);

  if (isLoading && articles.length === 0) {
    return (
        <div className="flex flex-col justify-center items-center min-h-screen">
            <p className="mt-4 text-3xl text-white">Carregando dados do site...</p>
        </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-8">
      <button onClick={onBack} className="mb-6 text-blue-400 hover:text-blue-300">← Voltar para a lista</button>
      
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-3xl font-bold mb-2">Gerenciando: {site.site_url}</h2>
        <p className="text-gray-400">Usuário Conectado: {site.wp_username}</p>
      </div>

      <div className="mb-8">
        <h3 className="text-2xl font-semibold mb-4">Visão Geral</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <OverviewCard title="Domain Authority" value={overviewData?.da ?? 'N/A'} loading={isLoading} />
            <OverviewCard title="Backlinks" value={overviewData?.backlinks ?? 'N/A'} loading={isLoading} />
            <OverviewCard title="Ref. Domains" value={overviewData?.refDomains ?? 'N/A'} loading={isLoading} />
            <OverviewCard title="Keywords" value={overviewData?.keywords ?? 'N/A'} loading={isLoading} />
        </div>
      </div>

      {vps && (
        <>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-2xl font-semibold">Usuários do Site</h3>
                            </div>
                        <div className="bg-gray-800/50 rounded-lg border border-white/10 p-6">
                            {isLoading ? (
                                <p className="text-gray-400">Carregando usuários...</p>
                            ) : (
                                <>
                                    <div className="mb-4">
                                        <button onClick={() => setUserMgmtView('add_user')} className="bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700">
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
                                                {wpUsers.map((user) => (
                                                    <tr key={user.ID} className="bg-gray-800 border-b border-gray-700">
                                                        <td className="px-6 py-4">{user.ID}</td>
                                                        <td className="px-6 py-4">{user.user_login}</td>
                                                        <td className="px-6 py-4">{user.user_email}</td>
                                                        <td className="px-6 py-4">{user.roles}</td>
                                                        <td className="px-6 py-4">
                                                            <button onClick={() => { setUserToEdit(user); setUserMgmtView('edit_user'); }} className="font-medium text-blue-500 hover:underline mr-4">Editar</button>
                                                            <button onClick={() => { setUserToDelete(user); setUserMgmtView('confirm_delete'); }} className="font-medium text-red-500 hover:underline">Deletar</button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </>
                            )}
                        </div>
        </>
      )}

      <div>
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-2xl font-semibold">Artigos</h3>
            <button onClick={() => setIsCreateArticleModalOpen(true)} className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 flex items-center gap-2">
                <AddIcon className="w-5 h-5" />
                Criar Artigo com IA
            </button>
        </div>
        <div className="bg-gray-800/50 rounded-lg border border-white/10">
            <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-800">
                    <tr>
                        <th scope="col" className="py-3.5 px-4 text-left text-sm font-semibold text-white">Título</th>
                        <th scope="col" className="py-3.5 px-4 text-left text-sm font-semibold text-white">Status</th>
                        <th scope="col" className="py-3.5 px-4 text-left text-sm font-semibold text-white">Data</th>
                        <th scope="col" className="py-3.5 px-4 text-left text-sm font-semibold text-white">Ações</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                    {articles.map(article => (
                        <tr key={article.id}>
                            <td className="whitespace-nowrap py-4 px-4 text-sm text-gray-300">{article.title.rendered}</td>
                            <td className="whitespace-nowrap py-4 px-4 text-sm text-gray-300">
                              {article.status === 'creating' ? <div className="w-24 bg-gray-700 rounded-full h-2.5"><div className="bg-blue-500 h-2.5 rounded-full animate-pulse"></div></div> : <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${article.status === 'publish' ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300'}`}>{article.status}</span>}
                            </td>
                            <td className="whitespace-nowrap py-4 px-4 text-sm text-gray-300">{new Date(article.date).toLocaleDateString()}</td>
                            <td className="whitespace-nowrap py-4 px-4 text-sm text-gray-300 flex items-center gap-4">
                                {article.status !== 'creating' ? (<><a href={article.link} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-600"><EyeIcon className="w-5 h-5" /></a><a href={`${site.site_url.replace(/\/?$/, '')}/wp-admin/post.php?post=${article.id}&action=edit`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-600"><PencilIcon className="w-5 h-5" /></a><button onClick={() => handleDeleteArticle(article.id)} className="text-red-500 hover:text-red-700"><TrashIcon className="w-5 h-5" /></button></>) : (<span className="text-xs text-gray-500">Criando...</span>)}
                            </td>
                        </tr>
                    ))}
                    {articles.length === 0 && !isLoading && (<tr><td colSpan={4} className="text-center py-8 text-gray-500">Nenhum artigo encontrado.</td></tr>)}
                </tbody>
            </table>
        </div>
      </div>

      <Modal isOpen={isCreateArticleModalOpen} onClose={() => setIsCreateArticleModalOpen(false)} title="Criar Novo Artigo com IA">
        <CreateArticleForm site={site} onArticleCreated={handleArticleCreated} onArticleUpdated={handleArticleUpdated} onCancel={() => setIsCreateArticleModalOpen(false)} />
      </Modal>

      {userMgmtView === 'add_user' && (
        <Modal isOpen={true} onClose={() => setUserMgmtView('user_list')} title={`Adicionar Novo Usuário em ${site.site_url}`}>
          <AddWpUserForm domain={site.site_url} onSubmit={(params) => startUserAction({ action: 'create-wp-user', params, title: `Criando usuário ${params.username}` })} onCancel={() => setUserMgmtView('user_list')} />
        </Modal>
      )}

      {userMgmtView === 'edit_user' && userToEdit && (
        <Modal isOpen={true} onClose={() => setUserMgmtView('user_list')} title={`Editar Usuário ${userToEdit.user_login} em ${site.site_url}`}>
          <EditWpUserForm user={userToEdit} domain={site.site_url} onSubmit={(params) => startUserAction({ action: 'update-wp-user', params, title: `Atualizando usuário` })} onCancel={() => setUserMgmtView('user_list')} />
        </Modal>
      )}

      {userMgmtView === 'confirm_delete' && userToDelete && (
        <Modal isOpen={true} onClose={() => setUserMgmtView('user_list')} title={`Confirmar Exclusão de Usuário em ${site.site_url}`}>
          <DeleteWpUserModal user={userToDelete} onConfirm={(user) => startUserAction({ action: 'delete-wp-user', params: { domain: site.site_url, userId: user.ID }, title: `Deletando usuário ${user.user_login}` })} onCancel={() => setUserMgmtView('user_list')} />
        </Modal>
      )}
    </div>
  );
};

export default WpDetails;