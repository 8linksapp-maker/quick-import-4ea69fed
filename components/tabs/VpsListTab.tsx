import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../src/supabaseClient';
import VpsCard, { VpsData } from '../VpsCard';
import Modal from '../Modal';
import { SearchIcon } from '../Icons';
import EditVpsForm from '../EditVpsForm';
import DeleteVpsModal from '../vps/modals/DeleteVpsModal';

interface VpsListTabProps {
  onVpsSelect: (vps: VpsData) => void;
  refetchTrigger: number;
}

const VpsListTab: React.FC<VpsListTabProps> = ({ onVpsSelect, refetchTrigger }) => {
  const [vpsList, setVpsList] = useState<VpsData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [vpsToEdit, setVpsToEdit] = useState<VpsData | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [vpsToDelete, setVpsToDelete] = useState<VpsData | null>(null);

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
    fetchVpsList();
  }, [fetchVpsList, refetchTrigger]);

  const handleVpsUpdated = () => { fetchVpsList(); setIsEditModalOpen(false); setVpsToEdit(null); };

  const handleEditVps = (vps: VpsData) => {
    setVpsToEdit(vps);
    setIsEditModalOpen(true);
  };

  const handleDeleteVps = (vps: VpsData) => {
    setVpsToDelete(vps);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!vpsToDelete) return;
    try {
      const { error } = await supabase.functions.invoke('delete-vps-credentials', { body: { id: vpsToDelete.id } });
      if (error) throw error;
      fetchVpsList();
    } catch (err: any) {
      alert(`Falha ao deletar o VPS: ${err.message}`);
    } finally {
      setIsDeleteModalOpen(false);
      setVpsToDelete(null);
    }
  };

  const filteredVps = vpsList.filter(vps => vps.host.toLowerCase().includes(searchTerm.toLowerCase()));

  if (loading) return <p className="text-center py-10">Carregando seus VPSs...</p>;
  if (error) return <p className="text-center text-red-500 py-10">{error}</p>;

  return (
    <>
      <div className="py-8 animate-fade-in">
        <div className="relative mb-8">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><SearchIcon /></div>
            <input type="text" placeholder="Procurar por host..." className="w-full bg-gray-900 border border-gray-700 rounded-md py-3 pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredVps.map(vps => (
            <div key={vps.id} onClick={() => onVpsSelect(vps)}>
                <VpsCard vps={vps} onDelete={() => handleDeleteVps(vps)} onEdit={() => handleEditVps(vps)} />
            </div>
          ))}
        </div>
      </div>
      {vpsToEdit && (
        <Modal isOpen={isEditModalOpen} onClose={() => { setIsEditModalOpen(false); setVpsToEdit(null); }} title="Editar VPS">
            <EditVpsForm vps={vpsToEdit} onVpsUpdated={handleVpsUpdated} onCancel={() => { setIsEditModalOpen(false); setVpsToEdit(null); }} />
        </Modal>
      )}
      {vpsToDelete && (
        <DeleteVpsModal
            isOpen={isDeleteModalOpen}
            onClose={() => setIsDeleteModalOpen(false)}
            onConfirm={handleConfirmDelete}
            vpsHost={vpsToDelete.host}
        />
      )}
    </>
  );
};

export default VpsListTab;
