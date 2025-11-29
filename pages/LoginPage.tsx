
import React, { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../src/supabaseClient';
import './LoginPage.css';

const LoginPage: React.FC = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLogin = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            setError(error.message);
        } else {
            navigate('/'); // Redirect to home on successful login
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
                    <h2>Entrar</h2>
                    {error && <div className="login-error">{error}</div>}
                    <form onSubmit={handleLogin}>
                        <input 
                            type="email" 
                            placeholder="Email" 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                        <input 
                            type="password" 
                            placeholder="Senha" 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                        <button type="submit" disabled={loading}>
                            {loading ? 'Entrando...' : 'Entrar'}
                        </button>
                    </form>
                    <div className="login-help">
                        <label>
                            <input type="checkbox" id="remember-me" />
                            Lembre-se de mim
                        </label>
                        <a href="/forgot-password">Esqueceu a senha?</a>
                    </div>
                    <div className="login-signup">
                        Primeira vez aqui? <a href="#">Assine agora.</a>
                    </div>
                    <div className="login-recaptcha">
                        Esta página é protegida pelo Google reCAPTCHA para garantir que você não é um robô. <a href="#">Saiba mais.</a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
