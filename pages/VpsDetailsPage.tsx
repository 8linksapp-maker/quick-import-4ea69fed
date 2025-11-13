import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../src/supabaseClient';
import { ArrowLeftIcon, CheckCircleIcon, XCircleIcon, CubeIcon } from '../components/Icons';
import { LoadingSpinner } from '../components/Icons';

// Action Card Component
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

const VpsDetailsPage: React.FC = () => {
  const { vpsId } = useParams<{ vpsId: string }>();
  const [woStatus, setWoStatus] = useState<'checking' | 'installed' | 'not-installed'>('checking');
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const checkWoStatus = useCallback(async () => {
    if (!vpsId) return;
    setWoStatus('checking');
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('check-wordops-installed', {
        body: { vpsId: parseInt(vpsId, 10) },
      });
      if (invokeError) throw invokeError;
      if (data.error) throw new Error(data.error);
      setWoStatus(data.installed ? 'installed' : 'not-installed');
    } catch (err: any) {
      setError(err.message);
      setWoStatus('not-installed'); // Assume not installed on error
    }
  }, [vpsId]);

  useEffect(() => {
    checkWoStatus();
  }, [checkWoStatus]);

  const handleInstallWordOps = async () => {
    if (window.confirm('Isso iniciará a instalação do WordOps. Pode levar vários minutos. Continuar?')) {
        setActionLoading('install-wo');
        setError(null);
        try {
            const { data, error: invokeError } = await supabase.functions.invoke('install-wordops', {
                body: { vpsId: parseInt(vpsId, 10) },
            });
            if (invokeError) throw invokeError;
            if (data.error) throw new Error(data.error);
            alert('Instalação do WordOps iniciada com sucesso! A página será atualizada.');
            checkWoStatus(); // Re-check status after starting installation
        } catch (err: any) {
            setError(err.message);
        } finally {
            setActionLoading(null);
        }
    }
  };

  const renderContent = () => {
    if (woStatus === 'checking') {
      return <div className="text-center"><LoadingSpinner /> <p className="mt-4">Verificando status do WordOps...</p></div>;
    }

    if (error) {
        return <div className="text-center text-red-500 bg-red-900/20 p-4 rounded-md"><strong>Erro:</strong> {error}</div>;
    }

    if (woStatus === 'installed') {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <ActionCard title="Instalar Site WordPress" onClick={() => alert('Função não implementada')} />
          <ActionCard title="Instalar SSL em um Site" onClick={() => alert('Função não implementada')} />
          <ActionCard title="Gerenciar Usuários WP" onClick={() => alert('Função não implementada')} />
          <ActionCard title="Deletar VPS" onClick={() => alert('Função não implementada')} />
        </div>
      );
    }

    if (woStatus === 'not-installed') {
      return (
        <div className="max-w-sm mx-auto">
            <ActionCard 
                title="Instalar WordOps" 
                onClick={handleInstallWordOps}
                loading={actionLoading === 'install-wo'}
            />
        </div>
      );
    }

    return null;
  };

  return (
    <div className="pt-24 bg-[#141414] min-h-screen text-white p-8">
      <div className="max-w-7xl mx-auto">
        <Link to="/manage-vps" className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 mb-8">
          <ArrowLeftIcon className="w-5 h-5" />
          Voltar
        </Link>
        <div className="flex justify-between items-center mb-8">
            <h1 className="text-4xl font-bold tracking-tighter">Painel de Controle da VPS</h1>
            <div className="flex items-center gap-2">
                {woStatus === 'installed' && <CheckCircleIcon />}
                {woStatus === 'not-installed' && <XCircleIcon />}
                <span className="text-lg">{woStatus === 'installed' ? 'WordOps Instalado' : (woStatus === 'not-installed' ? 'WordOps Não Instalado' : 'Verificando...')}</span>
            </div>
        </div>
        {renderContent()}
      </div>
    </div>
  );
};

export default VpsDetailsPage;
