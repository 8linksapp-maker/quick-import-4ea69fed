import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from './components/Header';
import { Toaster } from 'react-hot-toast';

const App: React.FC = () => {
    const location = useLocation();

    // Determine the view based on the current path
    const getView = (pathname: string): 'browse' | 'my_courses' | 'course_overview' | 'lesson' | 'login' => {
        if (pathname.startsWith('/course') && pathname.includes('/lesson')) return 'lesson';
        if (pathname.startsWith('/course')) return 'course_overview';
        if (pathname === '/my-courses') return 'my_courses';
        if (pathname === '/') return 'browse';
        if (pathname === '/login') return 'login';
        return 'browse'; // Default view
    };

    const currentView = getView(location.pathname);

    return (
        <div className="bg-[#141414] text-white min-h-screen">
            <Toaster 
                position="top-center"
                toastOptions={{
                    style: {
                        background: '#333',
                        color: '#fff',
                    },
                }}
            />
            <Header 
                view={currentView}
            />
            <Outlet />
        </div>
    );
};

export default App;