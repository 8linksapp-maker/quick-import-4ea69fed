import React, { useState } from 'react';
import { useAuth } from '../src/AuthContext';
import { supabase } from '../src/supabaseClient';
import { PencilIcon } from '../components/Icons';
import InputField from '../components/InputField';
import useDocumentTitle from '../src/hooks/useDocumentTitle';

const AccountSettingsPage: React.FC = () => {
    useDocumentTitle('Configurações da Conta');
    const { user } = useAuth();
    const [editingField, setEditingField] = useState<'name' | 'password' | null>(null);
    
    const [name, setName] = useState(user?.user_metadata.full_name || '');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        setError('');

        if (editingField === 'password' && (!password || password !== confirmPassword)) {
            setError("As senhas não coincidem ou estão em branco.");
            setLoading(false);
            return;
        }

        const updates: { password?: string; data?: { [key: string]: any } } = {};
        if (editingField === 'password' && password) {
            updates.password = password;
        }
        if (editingField === 'name' && name && name !== user?.user_metadata.full_name) {
            updates.data = { full_name: name };
        }

        if (Object.keys(updates).length === 0) {
            setEditingField(null);
            setLoading(false);
            return;
        }

        const { error } = await supabase.auth.updateUser(updates);

        if (error) {
            setError(error.message);
        } else {
            setMessage("Conta atualizada com sucesso!");
            if (updates.password) {
                setPassword('');
                setConfirmPassword('');
            }
        }
        setLoading(false);
        setEditingField(null);
    };

    const handleCancel = () => {
        setName(user?.user_metadata.full_name || '');
        setPassword('');
        setConfirmPassword('');
        setError('');
        setEditingField(null);
    };

    return (
        <div className="bg-[#141414] min-h-screen text-white flex items-center justify-center px-4 py-16">
            <div className="w-full max-w-3xl">
                <h1 className="text-4xl font-bold text-center mb-10">Conta</h1>
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg">
                    <div className="p-8 md:p-12">
                        <h2 className="text-lg font-semibold mb-2">Detalhes da conta</h2>
                        
                        {/* Email */}
                        <div className="flex justify-between items-center py-4 border-b border-white/10">
                            <div>
                                <p className="text-base font-medium">Endereço de e-mail</p>
                                <p className="text-sm text-gray-400">{user?.email}</p>
                            </div>
                        </div>

                        {/* Password */}
                        <div className="py-4 border-b border-white/10">
                            {editingField === 'password' ? (
                                <form onSubmit={handleUpdate}>
                                    <p className="text-base font-medium mb-4">Alterar Senha</p>
                                    <div className="space-y-4">
                                        <InputField
                                            id="password"
                                            label="Nova Senha"
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                        />
                                        <InputField
                                            id="confirmPassword"
                                            label="Confirmar Nova Senha"
                                            type="password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                        />
                                    </div>
                                    <div className="flex justify-end space-x-4 mt-6">
                                        <button type="button" onClick={handleCancel} className="px-4 py-2 rounded-md text-sm font-medium hover:bg-white/10">Cancelar</button>
                                        <button type="submit" disabled={loading} className="px-4 py-2 rounded-md text-sm font-medium bg-white text-black disabled:opacity-50">{loading ? 'Salvando...' : 'Salvar'}</button>
                                    </div>
                                </form>
                            ) : (
                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className="text-base font-medium">Senha</p>
                                        <p className="text-sm text-gray-400">••••••••</p>
                                    </div>
                                    <button onClick={() => setEditingField('password')} className="p-2 rounded-full hover:bg-white/10">
                                        <PencilIcon />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Name */}
                        <div className="py-4">
                            {editingField === 'name' ? (
                                <form onSubmit={handleUpdate}>
                                    <p className="text-base font-medium mb-4">Alterar Nome do perfil</p>
                                    <InputField
                                        id="name"
                                        label="Nome do perfil"
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                    />
                                    <div className="flex justify-end space-x-4 mt-6">
                                        <button type="button" onClick={handleCancel} className="px-4 py-2 rounded-md text-sm font-medium hover:bg-white/10">Cancelar</button>
                                        <button type="submit" disabled={loading} className="px-4 py-2 rounded-md text-sm font-medium bg-white text-black disabled:opacity-50">{loading ? 'Salvando...' : 'Salvar'}</button>
                                    </div>
                                </form>
                            ) : (
                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className="text-base font-medium">Nome do perfil</p>
                                        <p className="text-sm text-gray-400">{name}</p>
                                    </div>
                                    <button onClick={() => setEditingField('name')} className="p-2 rounded-full hover:bg-white/10">
                                        <PencilIcon />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <div className="mt-6">
                    {message && (
                        <div className="bg-green-500/20 border border-green-500 text-green-300 px-4 py-3 rounded-md text-sm">
                            {message}
                        </div>
                    )}
                    {error && (
                        <div className="bg-red-500/20 border border-red-500 text-red-300 px-4 py-3 rounded-md text-sm">
                            {error}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AccountSettingsPage;
