import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const AdminHeader: React.FC = () => {
    const location = useLocation();

    const navLinks = [
        { path: '/admin', label: 'Dashboard' },
        { path: '/admin/edit-main-page', label: 'Edit Main Page' },
        { path: '/admin/manage-users', label: 'Manage Users' },
        { path: '/admin/manage-courses', label: 'Manage Courses' },
        { path: '/admin/manage-apis', label: 'Manage APIs' },
        { path: '/admin/manage-prompts', label: 'Manage Prompts' },
    ];

    const linkClasses = "text-sm font-light cursor-pointer transition hover:text-gray-300";
    const activeLinkClasses = "text-white";
    const inactiveLinkClasses = "text-gray-300";

    return (
        <header className='fixed top-0 left-0 right-0 z-40 bg-[#141414]'>
            <div className="flex items-center justify-between px-4 md:px-16 py-2">
                <div className="flex items-center space-x-8">
                    <Link to="/admin">
                        <img src="/logo.svg" alt="SEOFLIX Logo" className="w-auto h-9 cursor-pointer" />
                    </Link>
                    <nav className="hidden md:flex items-center space-x-4">
                        {navLinks.map(link => (
                            <Link
                                key={link.path}
                                to={link.path}
                                className={`${linkClasses} ${location.pathname === link.path ? activeLinkClasses : inactiveLinkClasses}`}>
                                {link.label}
                            </Link>
                        ))}
                         <Link to="/" className={`${linkClasses} ${inactiveLinkClasses}`}>
                            Sair do Admin
                        </Link>
                    </nav>
                </div>
            </div>
        </header>
    );
};

export default AdminHeader;