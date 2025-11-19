import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../src/supabaseClient';
import VpsCard, { VpsData } from '../VpsCard';
import Modal from '../Modal';
import { SearchIcon, GridIcon, ListIcon } from '../Icons';
import EditVpsForm from '../EditVpsForm';
import VpsListItem from '../vps/VpsListItem';

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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const fetchVpsList = useCallback(async () => {
    // ... fetch logic
  }, []);

  useEffect(() => {
    fetchVpsList();
  }, [fetchVpsList, refetchTrigger]);

  const handleVpsUpdated = () => { fetchVpsList(); setIsEditModalOpen(false); setVpsToEdit(null); };

  const handleEditVps = (e: React.MouseEvent, vps: VpsData) => {
    e.stopPropagation();
    setVpsToEdit(vps);
    setIsEditModalOpen(true);
  };

  const handleDeleteVps = async (e: React.MouseEvent, vpsId: number) => {
    e.stopPropagation();
    if (window.confirm('Tem certeza que deseja deletar este VPS?')) {
      // ... delete logic
    }
  };

  const filteredVps = vpsList.filter(vps => vps.host.toLowerCase().includes(searchTerm.toLowerCase()));

  if (loading) return <p className="text-center py-10">Carregando seus VPSs...</p>;
  if (error) return <p className="text-center text-red-500 py-10">{error}</p>;

  return (
    <>
      <div className="py-8 animate-fade-in">
        <div className="flex justify-between items-center mb-8">
            <div className="relative flex-grow">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><SearchIcon /></div>
                <input type="text" placeholder="Procurar por host..." className="w-full bg-gray-900 border border-gray-700 rounded-md py-3 pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <div className="flex items-center ml-4">
                <button onClick={() => setViewMode('grid')} className={`p-2 rounded-l-md ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}>
                    <GridIcon className="w-5 h-5" />
                </button>
                <button onClick={() => setViewMode('list')} className={`p-2 rounded-r-md ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}>
                    <ListIcon className="w-5 h-5" />
                </button>
            </div>
        </div>

        {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredVps.map(vps => (
                    <div key={vps.id} onClick={() => onVpsSelect(vps)}>
                        <VpsCard vps={vps} onDelete={(e) => handleDeleteVps(e, vps.id)} onEdit={(e) => handleEditVps(e, vps)} />
                    </div>
                ))}
            </div>
        ) : (
            <div className="space-y-3">
                {filteredVps.map(vps => (
                    <VpsListItem 
                        key={vps.id}
                        vps={vps}
                        onSelect={onVpsSelect}
                        onDelete={handleDeleteVps}
                        onEdit={handleEditVps}
                    />
                ))}
            </div>
        )}
      </div>
      {vpsToEdit && (
        <Modal isOpen={isEditModalOpen} onClose={() => { setIsEditModalOpen(false); setVpsToEdit(null); }} title="Editar VPS">
            <EditVpsForm vps={vpsToEdit} onVpsUpdated={handleVpsUpdated} onCancel={() => { setIsEditModalOpen(false); setVpsToEdit(null); }} />
        </Modal>
      )}
    </>
  );
};

export default VpsListTab;
