import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/AuthContext';

interface GuestRouteProps {
    children: React.ReactElement;
}

const GuestRoute: React.FC<GuestRouteProps> = ({ children }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return <div>Loading...</div>;
    }

    if (user) {
        return <Navigate to="/" replace />;
    }

    return children;
};

export default GuestRoute;