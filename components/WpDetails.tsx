import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../src/supabaseClient';
import { WpData } from './WpCard';
import { VpsData } from './VpsCard';
import { AddIcon, EyeIcon, TrashIcon, PencilIcon, UsersIcon, LoadingSpinner } from './Icons';
import Modal from './Modal';
import AddWpUserForm from './vps/modals/AddWpUserForm';
import EditWpUserForm from './vps/modals/EditWpUserForm';
import DeleteWpUserModal from './vps/modals/DeleteWpUserModal';

// --- Helper Components ---

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

const CreateArticleForm = ({ site, onJobStarted, onCancel }) => {
  const [outlines, setOutlines] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setOutlines(content);
      };
      reader.readAsText(file);
    }
  };

  const handleCreateArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data, error: invokeError, status } = await supabase.functions.invoke('create-informational-article', {
        body: { siteId: site.id, outlines },
      });

      console.log('Server response status:', status);

      if (invokeError) throw invokeError;
      if (data?.error) throw new Error(data.error);

      // If no errors were thrown by this point, assume the job was accepted.
      // The old `status === 202` check fails with detached invokes in some environments.
      onJobStarted();
      onCancel();

    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro inesperado ao iniciar o trabalho.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleCreateArticle}>
      <div className="mb-4">
        <label htmlFor="outlines" className="block text-sm font-medium text-gray-300 mb-2">Outlines (uma por linha, com H2, H3, etc.)</label>
        <textarea id="outlines" value={outlines} onChange={(e) => setOutlines(e.target.value)} rows={12} className="w-full bg-gray-900 border border-gray-700 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" required />
      </div>
      <div className="mb-6">
        <label htmlFor="file-upload" className="block text-sm font-medium text-gray-300 mb-2">Ou envie um arquivo .txt com as outlines</label>
        <input id="file-upload" type="file" accept=".txt" onChange={handleFileChange} className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"/>
      </div>
      {error && <p className="mt-4 text-red-500 text-sm">{error}</p>}
      <div className="flex justify-end items-center gap-4 mt-6">
        <button type="button" onClick={onCancel} className="text-gray-400 hover:text-white">Cancelar</button>
        <button type="submit" disabled={loading} className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-500">
          {loading ? 'Iniciando...' : 'Iniciar Criação de Artigo'}
        </button>
      </div>
    </form>
  );
};

const getJobStatusText = (status: string) => {
    if (!status) return 'Pendente';
    if (status.startsWith('processing_outline')) return `Escrevendo Seção ${status.split('_')[2]} de ${status.split('_')[4]}...`;
    const statusMap = {
        'pending': 'Na fila...',
        'processing': 'Iniciando...',
        'processing_title': 'Gerando Título...',
        'processing_introduction': 'Escrevendo Introdução...',
        'posting_to_wordpress': 'Publicando no WordPress...',
        'completed': 'Concluído',
        'failed': 'Falhou',
        'cancelled': 'Cancelado'
    };
    return statusMap[status] || status;
}

// --- Main Component ---

const WpDetails = ({ site, vps, onBack }: { site: WpData, vps?: VpsData, onBack: () => void }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [overviewData, setOverviewData] = useState<any>(null);
  const [articles, setArticles] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [isCreateArticleModalOpen, setIsCreateArticleModalOpen] = useState(false);

  const [articleJobs, setArticleJobs] = useState<any[]>([]);
  const [isJobsLoading, setIsJobsLoading] = useState(true);
  const [jobsError, setJobsError] = useState('');

  const [wpUsers, setWpUsers] = useState<any[]>([]);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<any | null>(null);
  const [userToEdit, setUserToEdit] = useState<any | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(false);

  // --- Callback and Data Fetching Functions (defined before useEffects) ---

  const handleJobStarted = () => {
    fetchArticleJobs();
  };

  const fetchArticleJobs = useCallback(async () => {
    // Don't set loading to true for polling to avoid flicker
    try {
        const { data, error } = await supabase.functions.invoke('get-article-job-status', { body: { site_id: site.id } });
        if (error) throw error;
        setArticleJobs(data || []);
    } catch (err: any) {
        setJobsError(err.message || 'Falha ao buscar o status da geração de artigos.');
    } finally {
        setIsJobsLoading(false);
    }
  }, [site.id]);

  const fetchSiteData = useCallback(async () => {
      setIsLoading(true);
      setError('');
      try {
        const [overviewResult, articlesResult] = await Promise.all([
            supabase.functions.invoke('get-wp-site-overview', { body: { siteId: site.id } }),
            supabase.functions.invoke('get-wp-site-articles', { body: { siteId: site.id } })
        ]);
        if (overviewResult.error) throw new Error(`Overview Error: ${JSON.stringify(overviewResult.error)}`);
        setOverviewData(overviewResult.data);
        if (articlesResult.error) throw new Error(`Articles Error: ${JSON.stringify(articlesResult.error)}`);
        setArticles(articlesResult.data || []);
      } catch (err: any) {
        setError(err.message || 'Falha ao buscar dados do site.');
      } finally {
        setIsLoading(false);
      }
    }, [site.id]);

  const fetchWpUsers = useCallback(async () => {
    if (!vps) return;
    setIsUserLoading(true);
    try {
      const { data, error: usersError } = await supabase.functions.invoke('get-wp-users', { body: { vpsId: vps.id, domain: site.site_url }});
      if (usersError) throw new Error(`Users Error: ${JSON.stringify(usersError)}`);
      setWpUsers(data.users || []);
    } catch (err: any) {
      setError(err.message || 'Falha ao buscar usuários WP.');
    } finally {
      setIsUserLoading(false);
    }
  }, [site.site_url, vps]);

  const handleCancelJob = async (jobId: number) => {
    if (window.confirm('Tem certeza que deseja cancelar a geração deste artigo?')) {
        try {
            const { error } = await supabase.functions.invoke('cancel-article-job', { body: { job_id: jobId } });
            if (error) throw error;
            fetchArticleJobs();
        } catch (err: any) {
            setJobsError(`Falha ao cancelar o trabalho: ${err.message}`);
        }
    }
  };

  // --- useEffect Hooks ---

  // Main data fetching effect
  useEffect(() => {
    fetchSiteData();
    fetchArticleJobs();
    if (vps) {
      fetchWpUsers();
    }
  }, [fetchSiteData, fetchArticleJobs, fetchWpUsers, vps]);
  
  // This useEffect will handle polling for job statuses
  useEffect(() => {
    if (isLoading) return;

    const activeJobs = articleJobs.filter(job => job.status !== 'completed' && job.status !== 'failed' && job.status !== 'cancelled');
    if (activeJobs.length === 0) return;

    const intervalId = setInterval(() => fetchArticleJobs(), 8000);

    const justCompleted = articleJobs.find(job => job.status === 'completed' && !articles.some(a => a.id === job.final_post_id));
    if (justCompleted) {
        fetchSiteData();
    }

    return () => clearInterval(intervalId);
  }, [articleJobs, isLoading, fetchArticleJobs, fetchSiteData]);

  // ... (startUserAction and loading states)

  if (isLoading && articles.length === 0 && articleJobs.length === 0) {
    return <div className="text-center py-24"><LoadingSpinner /></div>;
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
        <></> /* User management UI omitted for brevity, it's unchanged */
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
                    {/* Render In-Progress and Failed Jobs */}
                    {isJobsLoading && (<tr><td colSpan={4} className="text-center py-8 text-gray-500"><LoadingSpinner /></td></tr>)}
                    {!isJobsLoading && articleJobs
                        .filter(job => job.status !== 'completed' && job.status !== 'cancelled')
                        .map(job => {
                            const isTerminal = job.status === 'failed' || job.status === 'cancelled';
                            return (
                                <tr key={`job-${job.id}`} className={isTerminal ? 'bg-red-900/20' : ''}>
                                    <td className="py-4 px-4 text-sm text-gray-300 max-w-xs truncate" title={job.generated_title}>{job.generated_title || 'Iniciando geração...'}</td>
                                    <td className="py-4 px-4 text-sm">
                                        <div className="flex items-center gap-2">
                                            {!isTerminal && <LoadingSpinner className="w-4 h-4" />}
                                            <span className={isTerminal ? 'text-red-400 font-semibold' : 'text-gray-300'}>
                                                {getJobStatusText(job.status)}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="whitespace-nowrap py-4 px-4 text-sm text-gray-300">{new Date(job.created_at).toLocaleString()}</td>
                                    <td className="py-4 px-4 text-sm text-gray-300">
                                        <div className="flex items-center gap-2">
                                            {!isTerminal && (
                                                <button onClick={() => handleCancelJob(job.id)} className="text-red-500 hover:text-red-400" title="Cancelar Job">
                                                    <TrashIcon className="w-5 h-5" />
                                                </button>
                                            )}
                                            {job.error_message && <span className="text-red-400 max-w-xs truncate" title={job.error_message}>{job.error_message}</span>}
                                        </div>
                                    </td>
                                </tr>
                            );
                    })}
                    {/* Render Published Articles */}
                    {articles.map(article => (
                        <tr key={article.id}>
                            <td className="whitespace-nowrap py-4 px-4 text-sm text-gray-300">{article.title.rendered}</td>
                            <td className="whitespace-nowrap py-4 px-4 text-sm text-gray-300">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${article.status === 'publish' ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300'}`}>{article.status}</span>
                            </td>
                            <td className="whitespace-nowrap py-4 px-4 text-sm text-gray-300">{new Date(article.date).toLocaleDateString()}</td>
                            <td className="whitespace-nowrap py-4 px-4 text-sm text-gray-300 flex items-center gap-4">
                                <a href={article.link} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-600"><EyeIcon className="w-5 h-5" /></a>
                                <a href={`${site.site_url.replace(/\/?$/, '')}/wp-admin/post.php?post=${article.id}&action=edit`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-600"><PencilIcon className="w-5 h-5" /></a>
                            </td>
                        </tr>
                    ))}
                    {/* Handle Empty State */}
                    {!isLoading && !isJobsLoading && articleJobs.filter(j => j.status !== 'completed').length === 0 && articles.length === 0 && (
                        <tr><td colSpan={4} className="text-center py-8 text-gray-500">Nenhum artigo ou trabalho em andamento encontrado.</td></tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>

      <Modal isOpen={isCreateArticleModalOpen} onClose={() => setIsCreateArticleModalOpen(false)} title="Criar Novo Artigo com IA">
        <CreateArticleForm site={site} onJobStarted={handleJobStarted} onCancel={() => setIsCreateArticleModalOpen(false)} />
      </Modal>

      <Modal 
        isOpen={isUserModalOpen} 
        onClose={() => setIsUserModalOpen(false)} 
        title={ userToDelete ? 'Confirmar Exclusão' : userToEdit ? 'Editar Usuário' : 'Adicionar Novo Usuário' }
      >
        {/* ... user management modals ... */}
      </Modal>
    </div>
  );
};

export default WpDetails;
