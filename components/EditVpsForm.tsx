import React, { useState } from 'react';
import { supabase } from '../src/supabaseClient';
import InputField from './InputField';

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
        if (invokeError || data?.error) throw invokeError || new Error(JSON.stringify(data.error));
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
        <div className="bg-blue-900/20 border border-blue-600/30 p-3 rounded mb-6 text-sm text-blue-200/90">
            <p className="flex items-center gap-2">
                <strong>Recomendação de Sistema Operacional:</strong>
            </p>
            <p className="mt-1">
                Para garantir o funcionamento correto de todas as automações (WordOps, SSL, etc), recomendamos fortemente que sua VPS utilize o sistema <strong>Ubuntu 20.04 LTS</strong> ou <strong>22.04 LTS</strong>.
            </p>
            <p className="mt-1 text-xs opacity-80">Outros sistemas baseados em Debian podem funcionar, mas não são garantidos.</p>
        </div>

        <div className="mb-4">
            <InputField label="IP do Servidor (Host)" id="host" type="text" value={host} onChange={(e) => setHost(e.target.value)} required />
            <p className="text-xs text-gray-400 mt-1">Insira o endereço IP numérico do seu servidor (ex: 192.168.1.1).</p>
        </div>

        <div className="mb-4">
            <InputField label="Porta" id="port" type="number" value={port} onChange={(e) => setPort(parseInt(e.target.value))} required />
            <p className="text-xs text-gray-400 mt-1">A porta padrão SSH geralmente é 22.</p>
        </div>

        <div className="mb-4">
            <InputField label="Usuário do Servidor (Username)" id="username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} required />
            <p className="text-xs text-gray-400 mt-1">O login de acesso ao servidor (geralmente 'root'). <strong>NÃO</strong> é o login da sua conta na empresa de hospedagem.</p>
        </div>

        <div className="mb-4">
            <InputField label="Nova Senha do Servidor (opcional)" id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <p className="text-xs text-gray-400 mt-1">A senha de acesso ao servidor (geralmente senha root). <strong>NÃO</strong> é a senha da sua conta na empresa de hospedagem.</p>
        </div>

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

export default EditVpsForm;
