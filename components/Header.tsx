import React, { useState, useEffect, useRef } from 'react';
import { SearchIcon, BellIcon, ChevronDownIcon } from './Icons';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/AuthContext';

const Header: React.FC<HeaderProps> = ({ view }) => {
    const [isScrolled, setIsScrolled] = useState(false);
    const location = useLocation();
    const { user, signOut } = useAuth();
    const navigate = useNavigate();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const isAdmin = user?.user_metadata?.role === 'Admin';

    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 10);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [dropdownRef]);

    const handleLogout = async () => {
        await signOut();
        navigate('/login');
    };

    const linkClasses = "text-sm font-light cursor-pointer transition hover:text-gray-300";
    const activeLinkClasses = "text-white";
    const inactiveLinkClasses = "text-gray-300";

    const isLessonView = view === 'lesson';
    const isLoginView = view === 'login';

    const profileDropdown = (
        <div className="relative" ref={dropdownRef}>
            <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="flex items-center space-x-2 group cursor-pointer">
                <img src="https://picsum.photos/32" alt="Profile" className="rounded" />
                <ChevronDownIcon className={`transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            {isDropdownOpen && (
                <div className="absolute top-full right-0 mt-3 w-56 bg-black/90 rounded-md shadow-lg ring-1 ring-white/10">
                    <div className="absolute -top-2 right-4 w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-b-8 border-b-black/90"></div>
                    <div className="py-2">
                        {isAdmin && (
                            <Link to="/admin" className="block px-4 py-2 text-sm text-gray-300 hover:bg-white/10">Admin</Link>
                        )}
                        <Link to="/account-settings" className="block px-4 py-2 text-sm text-gray-300 hover:bg-white/10">Conta</Link>
                        <Link to="/blog-house" className="block px-4 py-2 text-sm text-gray-300 hover:bg-white/10">Blog House</Link>
                        <a href="#" className="block px-4 py-2 text-sm text-gray-300 hover:bg-white/10">Central de Ajuda</a>
                        <hr className="border-gray-700 my-2" />
                        <button onClick={handleLogout} className="w-full text-left block px-4 py-2 text-sm text-gray-300 hover:bg-white/10">Sair</button>
                    </div>
                </div>
            )}
        </div>
    );

    if (isLoginView) {
        return null;
    }

    if (isLessonView) {
        return (
             <header className="fixed top-0 left-0 right-0 z-40 bg-[#181818] shadow-md">
                 <div className="flex items-center justify-between px-4 md:px-8 py-2">
                     <div className="flex items-center space-x-8">
                         <Link to="/">
                            <img src="/logo.svg" alt="SEOFLIX Logo" className="w-auto h-9 cursor-pointer" />
                         </Link>
                         <div className="h-6 w-px bg-gray-700"></div>
                         <Link to="/" className="text-sm font-light text-gray-200 hover:text-white transition">
                            Sair do Player
                         </Link>
                     </div>
                     <div className="flex items-center space-x-4 text-white">
                         {profileDropdown}
                     </div>
                 </div>
             </header>
        );
    }

    return (
        <header className={`fixed top-0 left-0 right-0 z-40 transition-colors duration-300 ${isScrolled || view === 'my_courses' || view === 'course_overview' ? 'bg-[#141414]' : 'bg-gradient-to-b from-black/70 to-transparent'}`}>
            <div className="flex items-center justify-between px-4 md:px-16 py-2">
                <div className="flex items-center space-x-8">
                    <Link to="/">
                                                    <img src="/logo.svg" alt="SEOFLIX Logo" className="w-auto h-9 cursor-pointer" />                    </Link>
                    <nav className="hidden md:flex items-center space-x-4">
                        <Link to="/" className={`${linkClasses} ${location.pathname === '/' ? activeLinkClasses : inactiveLinkClasses}`}>
                            Início
                        </Link>
                        <Link to="/my-courses" className={`${linkClasses} ${location.pathname === '/my-courses' ? activeLinkClasses : inactiveLinkClasses}`}>
                            Meus Cursos
                        </Link>
                        <Link to="/blog-house" className={`${linkClasses} ${location.pathname === '/blog-house' ? activeLinkClasses : inactiveLinkClasses}`}>
                            Blog House
                        </Link>
                    </nav>
                </div>
                <div className="flex items-center space-x-4 text-white">
                    <BellIcon />
                    {profileDropdown}
                </div>
            </div>
        </header>
    );
};

export default Header;
