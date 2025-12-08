import React, { useState, useEffect } from 'react';
import Modal from '../../components/Modal';
import InputField from '../../components/InputField';
import { supabase } from '../../src/supabaseClient';
import useDocumentTitle from '../../src/hooks/useDocumentTitle';

interface Api {
    id: string;
    name: string;
    credentials: any;
    status: string;
}

const ManageApisPage: React.FC = () => {
    useDocumentTitle('Admin: Gerenciar APIs');
    const [apis, setApis] = useState<Api[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedApi, setSelectedApi] = useState('');
    const [apiData, setApiData] = useState<any>({});
    const [editingApi, setEditingApi] = useState<Api | null>(null);

    const fetchApis = async () => {
        try {
            const { data, error } = await supabase.functions.invoke('get-api-configs');
            if (error) throw error;
            setApis(data.data);
        } catch (error: any) {
            console.error('Error fetching APIs:', error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchApis();
    }, []);

    const openModal = (api: Api | null = null) => {
        if (api) {
            setEditingApi(api);
            setSelectedApi(api.name);
            setApiData(api.credentials);
        } else {
            setEditingApi(null);
            setSelectedApi('');
            setApiData({});
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingApi(null);
        setSelectedApi('');
        setApiData({});
    };

    const handleSave = async () => {
        try {
            if (editingApi) {
                const { data, error } = await supabase.functions.invoke('update-api-config', {
                    body: { id: editingApi.id, name: selectedApi, credentials: apiData, status: 'Active' },
                });
                if (error) throw error;
                setApis(apis.map(api => api.id === editingApi.id ? data.data[0] : api));
            } else {
                const { data, error } = await supabase.functions.invoke('create-api-config', {
                    body: { name: selectedApi, credentials: apiData, status: 'Active' },
                });
                if (error) throw error;
                setApis([...apis, data.data[0]]);
            }
            closeModal();
        } catch (error: any) {
            console.error('Error saving API:', error.message);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            const { error } = await supabase.functions.invoke('delete-api-config', {
                body: { id },
            });
            if (error) throw error;
            setApis(apis.filter(api => api.id !== id));
        } catch (error: any) {
            console.error('Error deleting API:', error.message);
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl md:text-3xl font-bold">Gerenciar APIs</h2>
                <button onClick={() => openModal()} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md transition-colors">Adicionar API</button>
            </div>
            <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-lg shadow-lg overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-white/10">
                        <tr>
                            <th className="p-4 font-semibold">Name</th>
                            <th className="p-4 font-semibold">Status</th>
                            <th className="p-4 font-semibold text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={3} className="text-center p-8">Carregando...</td></tr>
                        ) : (
                            apis.map((api, index) => (
                                <tr key={api.id} className={`border-t border-white/10 ${index % 2 === 0 ? 'bg-transparent' : 'bg-white/5'}`}>
                                    <td className="p-4">{api.name}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                            api.status === 'Active' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
                                        }`}>
                                            {api.status}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right">
                                        <button onClick={() => openModal(api)} className="text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors mr-4">Edit</button>
                                        <button onClick={() => handleDelete(api.id)} className="text-sm font-medium text-red-500 hover:text-red-400 transition-colors">Delete</button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <Modal isOpen={isModalOpen} onClose={closeModal} title={editingApi ? 'Editar API' : 'Adicionar Nova API'}>
                    <div className="p-6">
                        <div className="mb-4">
                            <label className="block text-white text-sm font-bold mb-2" htmlFor="api-select">
                                Selecione a API
                            </label>
                            <select
                                id="api-select"
                                value={selectedApi}
                                onChange={(e) => setSelectedApi(e.target.value)}
                                className="shadow appearance-none border border-gray-600 rounded w-full py-2 px-3 bg-gray-800 text-white leading-tight focus:outline-none focus:shadow-outline"
                                disabled={!!editingApi}
                            >
                                <option value="">Selecione uma API</option>
                                <option value="Kiwify" disabled={apis.some(api => api.name === 'Kiwify')}>
                                    Kiwify
                                </option>
                                <option value="ChatGPT" disabled={apis.some(api => api.name === 'ChatGPT')}>
                                    ChatGPT
                                </option>
                                <option value="Backblaze B2" disabled={apis.some(api => api.name === 'Backblaze B2')}>
                                    Backblaze B2
                                </option>
                            </select>
                        </div>

                        {selectedApi === 'Kiwify' && (
                            <div>
                                <InputField
                                    label="Kiwify Account ID"
                                    value={apiData.accountId || ''}
                                    onChange={(e) => setApiData({ ...apiData, accountId: e.target.value })}
                                />
                                <InputField
                                    label="Kiwify Client ID"
                                    value={apiData.clientId || ''}
                                    onChange={(e) => setApiData({ ...apiData, clientId: e.target.value })}
                                />
                                <InputField
                                    label="Kiwify Client Secret"
                                    type="password"
                                    value={apiData.clientSecret || ''}
                                    onChange={(e) => setApiData({ ...apiData, clientSecret: e.target.value })}
                                />
                            </div>
                        )}

                        {selectedApi === 'ChatGPT' && (
                            <div>
                                <InputField
                                    label="ChatGPT API Key"
                                    type="password"
                                    value={apiData.apiKey || ''}
                                    onChange={(e) => setApiData({ ...apiData, apiKey: e.target.value })}
                                />
                            </div>
                        )}

                        {selectedApi === 'Backblaze B2' && (
                            <div>
                                <InputField
                                    label="B2 Key ID"
                                    value={apiData.keyId || ''}
                                    onChange={(e) => setApiData({ ...apiData, keyId: e.target.value })}
                                />
                                <InputField
                                    label="B2 Application Key"
                                    type="password"
                                    value={apiData.applicationKey || ''}
                                    onChange={(e) => setApiData({ ...apiData, applicationKey: e.target.value })}
                                />
                                <InputField
                                    label="B2 Endpoint (ex: s3.us-west-004.backblazeb2.com)"
                                    value={apiData.endpoint || ''}
                                    onChange={(e) => setApiData({ ...apiData, endpoint: e.target.value })}
                                />
                                <InputField
                                    label="B2 Bucket Name"
                                    value={apiData.bucketName || ''}
                                    onChange={(e) => setApiData({ ...apiData, bucketName: e.target.value })}
                                />
                                <InputField
                                    label="B2 Public URL Base (ex: https://f004.backblazeb2.com/file)"
                                    value={apiData.publicUrlBase || ''}
                                    onChange={(e) => setApiData({ ...apiData, publicUrlBase: e.target.value })}
                                />
                                <InputField
                                    label="B2 Region (ex: us-west-004)"
                                    value={apiData.region || ''}
                                    onChange={(e) => setApiData({ ...apiData, region: e.target.value })}
                                />
                            </div>
                        )}

                        <div className="flex justify-end mt-6">
                            <button onClick={closeModal} className="mr-4 px-4 py-2 rounded-md bg-gray-600 hover:bg-gray-700 transition-colors">Cancelar</button>
                            <button onClick={handleSave} className="px-4 py-2 rounded-md bg-red-600 hover:bg-red-700 transition-colors">Salvar</button>
                        </div>
                    </div>
                </Modal>
            )}

        </div>
    );
};

export default ManageApisPage;