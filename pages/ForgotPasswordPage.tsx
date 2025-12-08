import React, { useState, FormEvent } from 'react';
import { supabase } from '../src/supabaseClient';
import './LoginPage.css'; // Reusing login page styles for consistency
import useDocumentTitle from '../src/hooks/useDocumentTitle';

const ForgotPasswordPage: React.FC = () => {
    useDocumentTitle('Recuperar Senha');
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handlePasswordReset = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`,
        });

        if (error) {
            setError(error.message);
        } else {
            setMessage('Se a sua conta existir, um link para redefinir a senha foi enviado para o seu e-mail.');
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
                    <h2>Redefinir Senha</h2>
                    <p style={{ color: '#b3b3b3', marginBottom: '20px' }}>Insira o seu e-mail e enviaremos um link para voltar a aceder à sua conta.</p>
                    
                    {message && <div style={{ color: 'green', marginBottom: '15px' }}>{message}</div>}
                    {error && <div className="login-error">{error}</div>}

                    <form onSubmit={handlePasswordReset}>
                        <input 
                            type="email" 
                            placeholder="Email" 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                        <button type="submit" disabled={loading}>
                            {loading ? 'A enviar...' : 'Enviar Link'}
                        </button>
                    </form>
                    <div style={{ textAlign: 'center', marginTop: '20px' }}>
                        <a href="/login" style={{ color: 'white' }}>Voltar para o Login</a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ForgotPasswordPage;
