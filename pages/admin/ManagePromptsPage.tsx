
import React, { useState, useEffect } from 'react';
import { supabase } from '../../src/supabaseClient';
import InputField from '../../components/InputField';
import Modal from '../../components/Modal';
import { AddIcon as PlusIcon, SearchIcon, PencilIcon, TrashIcon, StarIcon } from '../../components/Icons';

interface PromptData {
  id: number;
  prompt_type: string;
  prompt_text: string;
  is_default: boolean;
}

const PromptCard: React.FC<{ prompt: PromptData; onEdit: () => void; onDelete: () => void; }> = ({ prompt, onEdit, onDelete }) => {
  return (
    <div className={`bg-gray-800 border rounded-lg p-6 group transition-colors flex flex-col justify-between h-full ${prompt.is_default ? 'border-blue-500' : 'border-gray-700'}`}>
      <div>
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors capitalize">{prompt.prompt_type}</h3>
          {prompt.is_default && (
            <div className="flex items-center gap-1 text-xs text-blue-400">
              <StarIcon className="w-4 h-4" />
              <span>Padrão</span>
            </div>
          )}
        </div>
        <p className="text-sm text-gray-400 mt-2 line-clamp-3">{prompt.prompt_text}</p>
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <button onClick={onEdit} className="text-blue-400 hover:text-blue-600 p-1 rounded-full hover:bg-gray-700 transition-colors"><PencilIcon className="w-5 h-5" /></button>
        <button onClick={onDelete} className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-gray-700 transition-colors"><TrashIcon className="w-5 h-5" /></button>
      </div>
    </div>
  );
};

const PromptForm = ({ prompt, onPromptSaved, onCancel }) => {
  const [promptType, setPromptType] = useState(prompt?.prompt_type || '');
  const [promptText, setPromptText] = useState(prompt?.prompt_text || '');
  const [isDefault, setIsDefault] = useState(prompt?.is_default || false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');
    try {
      // We don't need to call a different function. The trigger in the DB will handle unsetting other defaults.
      const functionName = prompt ? 'update-prompt' : 'save-prompt';
      const body = { 
        prompt_type: promptType, 
        prompt_text: promptText,
        is_default: isDefault
      };
      if(prompt) body.id = prompt.id;

      const { data, error: invokeError } = await supabase.functions.invoke(functionName, { body });
      if (invokeError) throw invokeError;
      if (data.error) throw new Error(data.error);
      setMessage(data.message || `Prompt ${prompt ? 'atualizado' : 'salvo'} com sucesso!`);
      setTimeout(() => onPromptSaved(), 1500);
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro inesperado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSave}>
      <div className="mb-4">
        <label htmlFor="promptType" className="block text-sm font-medium text-gray-300 mb-2">Tipo de Prompt</label>
        <select 
          id="promptType" 
          value={promptType} 
          onChange={(e) => setPromptType(e.target.value)} 
          className="w-full bg-gray-900 border border-gray-700 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" 
          required
        >
          <option value="" disabled>Selecione um tipo</option>
          <option value="informational">Informacional</option>
          <option value="commercial">Comercial</option>
        </select>
      </div>
      <div className="mt-4">
        <label htmlFor="promptText" className="block text-sm font-medium text-gray-300 mb-2">Texto do Prompt</label>
        <textarea id="promptText" value={promptText} onChange={(e) => setPromptText(e.target.value)} rows={12} className="w-full bg-gray-900 border border-gray-700 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" required />
      </div>
      <div className="mt-6">
        <label className="flex items-center">
          <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 bg-gray-700" />
          <span className="ml-2 text-sm text-gray-300">Definir como padrão para este tipo de prompt</span>
        </label>
      </div>
      <div className="flex justify-end items-center gap-4 mt-6">
        <button type="button" onClick={onCancel} className="text-gray-400 hover:text-white">Cancelar</button>
        <button type="submit" disabled={loading} className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-500">
          {loading ? 'Salvando...' : 'Salvar Prompt'}
        </button>
      </div>
      {message && <p className="mt-4 text-green-500 text-center">{message}</p>}
      {error && <p className="mt-4 text-red-500 text-center">{error}</p>}
    </form>
  );
};

const ManagePromptsPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [promptToEdit, setPromptToEdit] = useState<PromptData | null>(null);
  const [prompts, setPrompts] = useState<PromptData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchPrompts = async () => {
    setLoading(true);
    setError('');
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('get-prompts');
      if (invokeError) throw invokeError;
      if (data.error) throw new Error(data.error);
      setPrompts(data || []);
    } catch (err: any) {
      setError(err.message || 'Falha ao buscar os prompts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPrompts(); }, []);

  const handlePromptSaved = () => { fetchPrompts(); setIsModalOpen(false); setPromptToEdit(null); };

  const handleEditPrompt = (prompt) => {
    setPromptToEdit(prompt);
    setIsModalOpen(true);
  };

  const handleDeletePrompt = async (promptId) => {
    if (window.confirm('Tem certeza que deseja deletar este prompt?')) {
      try {
        const { error } = await supabase.functions.invoke('delete-prompt', { body: { id: promptId } });
        if (error) throw error;
        fetchPrompts();
      } catch (err: any) {
        setError(err.message || 'Falha ao deletar o prompt.');
      }
    }
  };

  const openAddModal = () => {
    setPromptToEdit(null);
    setIsModalOpen(true);
  }

  const filteredPrompts = prompts.filter(p => p.prompt_type.toLowerCase().includes(searchTerm.toLowerCase()));

  if (loading) return <p className="text-center pt-24">Carregando prompts...</p>;
  if (error) return <p className="text-center pt-24 text-red-500">{error}</p>;

  return (
    <div className="px-4 md:px-16 py-8 pt-24 bg-[#141414] min-h-screen text-white">
      <div className="flex justify-between items-center mb-8"><h1 className="text-4xl font-bold tracking-tighter">Gerenciar Prompts de IA</h1></div>
      <div className="relative mb-8">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><SearchIcon /></div>
          <input type="text" placeholder="Procurar por tipo..." className="w-full bg-gray-900 border border-gray-700 rounded-md py-3 pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <div className="bg-gray-800/50 border-2 border-dashed border-gray-600 rounded-lg flex flex-col items-center justify-center p-6 cursor-pointer hover:bg-gray-800 hover:border-gray-500 transition-colors h-full min-h-[200px]" onClick={openAddModal}>
          <PlusIcon />
          <h3 className="text-lg font-semibold text-white mt-4">Adicionar Novo Prompt</h3>
        </div>
        {filteredPrompts.map(p => <PromptCard key={p.id} prompt={p} onDelete={() => handleDeletePrompt(p.id)} onEdit={() => handleEditPrompt(p)} />)}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setPromptToEdit(null);}} title={promptToEdit ? 'Editar Prompt' : 'Adicionar Novo Prompt'}>
        <PromptForm prompt={promptToEdit} onPromptSaved={handlePromptSaved} onCancel={() => { setIsModalOpen(false); setPromptToEdit(null); }} />
      </Modal>
    </div>
  );
};

export default ManagePromptsPage;
