import React, { useState, FormEvent, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../src/supabaseClient';
import './LoginPage.css'; // Reusing styles

const ResetPasswordPage: React.FC = () => {
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        // This is a simplified check. Supabase handles the token from the URL fragment automatically
        // when the user lands on this page from the email link.
        const hash = window.location.hash;
        if (!hash.includes('access_token')) {
             setError("Token de redefinição inválido ou ausente. Por favor, solicite um novo link.");
        }
    }, []);

    const handlePasswordUpdate = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);

        const { error } = await supabase.auth.updateUser({ password: password });

        if (error) {
            setError(`Erro ao atualizar a senha: ${error.message}`);
        } else {
            setMessage('Senha atualizada com sucesso! A redirecionar para o login...');
            setTimeout(() => {
                navigate('/login');
            }, 3000);
        }
        setLoading(false);
    };

    return (
        <div className="login-container">
            <div className="login-header">
                <h1 className="login-logo">SEO FLIX</h1>
            </div>
            <div className="login-body">
                <div className="login-card">
                    <h2>Crie uma Nova Senha</h2>
                    
                    {message && <div style={{ color: 'green', marginBottom: '15px' }}>{message}</div>}
                    {error && <div className="login-error">{error}</div>}

                    <form onSubmit={handlePasswordUpdate}>
                        <input 
                            type="password" 
                            placeholder="Digite a sua nova senha" 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                        <button type="submit" disabled={loading}>
                            {loading ? 'A guardar...' : 'Guardar Nova Senha'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ResetPasswordPage;
