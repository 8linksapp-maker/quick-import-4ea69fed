
import { Link } from 'react-router-dom';
import { supabase } from '../src/supabaseClient';
import InputField from '../components/InputField';
import VpsCard, { VpsData } from '../components/VpsCard';
import Modal from '../components/Modal';
import { AddIcon as PlusIcon, SearchIcon } from '../components/Icons';

// Form for adding a new VPS (inside a modal)
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

// Form for editing a VPS (inside a modal)
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

// Main Page Component
const ManageVpsPage = () => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [vpsToEdit, setVpsToEdit] = useState<VpsData | null>(null);
  const [vpsList, setVpsList] = useState<VpsData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchVpsList = async () => {
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
  };

  useEffect(() => { fetchVpsList(); }, []);

  const handleVpsAdded = () => { fetchVpsList(); setIsAddModalOpen(false); };

  const handleVpsUpdated = () => { fetchVpsList(); setIsEditModalOpen(false); };

  const handleEditVps = (vps) => {
    setVpsToEdit(vps);
    setIsEditModalOpen(true);
  };

  const handleDeleteVps = async (vpsId) => {
    if (window.confirm('Tem certeza que deseja deletar este VPS?')) {
      try {
        const { error } = await supabase.functions.invoke('delete-vps-credentials', { body: { id: vpsId } });
        if (error) throw error;
        fetchVpsList();
      } catch (err: any) {
        setError(err.message || 'Falha ao deletar o VPS.');
      }
    }
  };

  const filteredVpsList = vpsList.filter(vps => vps.host.toLowerCase().includes(searchTerm.toLowerCase()));

  const renderListView = () => {
    if (loading) return <p className="text-center">Carregando seus VPSs...</p>;
    if (error) return <p className="text-center text-red-500">{error}</p>;
    return (
      <div className="px-4 md:px-16 py-8">
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
          {filteredVpsList.map(vps => (
            <Link to={`/vps/${vps.id}`} key={vps.id} className="no-underline">
              <VpsCard vps={vps} onDelete={() => handleDeleteVps(vps.id)} onEdit={() => handleEditVps(vps)} />
            </Link>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="pt-24 bg-[#141414] min-h-screen text-white">
      {renderListView()}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Adicionar Novo VPS"><AddVpsForm onVpsAdded={handleVpsAdded} onCancel={() => setIsAddModalOpen(false)} /></Modal>
      {vpsToEdit && <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Editar VPS"><EditVpsForm vps={vpsToEdit} onVpsUpdated={handleVpsUpdated} onCancel={() => setIsEditModalOpen(false)} /></Modal>}
    </div>
  );
};

export default ManageVpsPage;
