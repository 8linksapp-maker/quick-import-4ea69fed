import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';

interface AuthContextType {
    session: Session | null;
    user: User | null;
    loading: boolean;
    signOut: () => Promise<void>;
    invoke: (functionName: string, options?: any) => Promise<any>;
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

    const invoke = async (functionName: string, options?: any) => {
        try {
            const { data, error } = await supabase.functions.invoke(functionName, options);

            if (error) {
                // Check for auth errors and handle them globally
                if (
                    error instanceof Error &&
                    'status' in error &&
                    (error.status === 401 || error.status === 403)
                ) {
                    console.warn(`Authentication error for function '${functionName}'. Signing out.`);
                    await supabase.auth.signOut();
                    window.location.href = '/login?error=session_expired';
                    // Return a promise that never resolves to prevent further processing
                    return new Promise(() => {});
                }
                throw error;
            }
            return data;
        } catch (err) {
            // This will catch the re-thrown error or other network errors
            console.error(`Error invoking function '${functionName}':`, err);
            // Also check for auth errors on the caught object
            if (
                err instanceof Error &&
                'status' in err &&
                (err.status === 401 || err.status === 403)
            ) {
                console.warn(`Authentication error for function '${functionName}'. Signing out.`);
                await supabase.auth.signOut();
                window.location.href = '/login?error=session_expired';
                return new Promise(() => {});
            }
            throw err;
        }
    };

    const signOut = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('Error signing out, clearing session manually.');
            // If sign out fails (e.g., due to the same 403 error),
            // force a redirect to login which will effectively reset the state.
            window.location.href = '/login';
        }
    };

    const value = {
        session,
        user,
        loading,
        signOut,
        invoke,
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