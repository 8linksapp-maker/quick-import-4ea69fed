import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MoreVerticalIcon } from '../Icons';

const AdminHeader: React.FC = () => {
    const location = useLocation();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

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

    const handleClickOutside = (event: MouseEvent) => {
        if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
            setIsMenuOpen(false);
        }
    };

    useEffect(() => {
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

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
                <div className="md:hidden" ref={menuRef}>
                    <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-white">
                        <MoreVerticalIcon className="w-6 h-6" />
                    </button>
                    {isMenuOpen && (
                        <div className="absolute right-4 mt-2 w-48 bg-[#141414] rounded-md shadow-lg py-1">
                            {navLinks.map(link => (
                                <Link
                                    key={link.path}
                                    to={link.path}
                                    className={`block px-4 py-2 text-sm ${location.pathname === link.path ? 'text-white bg-gray-700' : 'text-gray-300'} hover:bg-gray-700 hover:text-white`}
                                    onClick={() => setIsMenuOpen(false)}
                                >
                                    {link.label}
                                </Link>
                            ))}
                            <Link 
                                to="/" 
                                className={`block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white`}
                                onClick={() => setIsMenuOpen(false)}
                            >
                                Sair do Admin
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default AdminHeader;