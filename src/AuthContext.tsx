import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';

interface AuthContextType {
    session: Session | null;
    user: User | null;
    loading: boolean;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // DETECTAR INTENÇÃO DE RESETAR SENHA (mesmo antes da sessão carregar)
        if (window.location.hash && window.location.hash.includes('type=recovery')) {
             console.log("Recovery hash detected. Setting flag.");
             localStorage.setItem('is_resetting_password', 'true');
        }

        const getSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        };

        getSession();

        const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
            setSession(session);
            setUser(session?.user ?? null);

            if (event === 'PASSWORD_RECOVERY') {
                window.location.href = '/reset-password';
            }
        });

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, []);

    // EFEITO EXTRA: Redirecionar se logado e com flag de reset
    useEffect(() => {
        if (session && localStorage.getItem('is_resetting_password') === 'true') {
             console.log("Session active + Reset Flag detected. Redirecting to /reset-password");
             localStorage.removeItem('is_resetting_password');
             // Usando window.location para garantir reload limpo
             window.location.href = '/reset-password';
        }
    }, [session]);

    const signOut = async () => {
        await supabase.auth.signOut();
    };

    const value = {
        session,
        user,
        loading,
        signOut,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};