import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import logo from '../../assets/logo.svg';

const Sidebar = () => {
    const [isOpen, setIsOpen] = useState(true);

    const toggleSidebar = () => setIsOpen(!isOpen);

    const menuItems = [
        {
            path: '/dashboard', label: 'Dashboard', icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
            )
        },
        {
            path: '/colaboradores', label: 'Colaboradores', icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
            )
        },
        {
            path: '/documentacao', label: 'Documentação', icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
            )
        },
        {
            path: '/importacao', label: 'Importação', icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
            )
        },
    ];

    return (
        <div className={`${isOpen ? 'w-64' : 'w-20'} h-screen bg-slate-900 transition-all duration-300 ease-in-out flex flex-col shadow-xl`}>
            {/* Header com Logo e Toggle */}
            <div className="flex items-center justify-between p-4 h-20 border-b border-slate-700">
                <div className={`flex items-center gap-3 overflow-hidden ${!isOpen && 'hidden'}`}>
                    <img src={logo} alt="Logo" className="w-8 h-8 rounded-md" />
                    <span className="text-white font-bold text-lg whitespace-nowrap">QualyBuss</span>
                </div>

                <button
                    onClick={toggleSidebar}
                    className={`p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors ${!isOpen && 'mx-auto'}`}
                >
                    {isOpen ? (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                        </svg>
                    ) : (
                        <img src={logo} alt="Logo" className="w-8 h-8 rounded-md" />
                    )}
                </button>
            </div>

            {/* Menu Navigation */}
            <nav className="flex-1 py-6 px-3 flex flex-col gap-2 overflow-y-auto">
                {menuItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) => `
              flex items-center px-4 py-3 rounded-xl transition-all duration-200 group
              ${isActive
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50'
                                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                            }
            `}
                    >
                        <div className="flex-shrink-0">
                            {item.icon}
                        </div>
                        <span className={`ml-3 font-medium whitespace-nowrap overflow-hidden transition-all duration-300 ${!isOpen ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
                            {item.label}
                        </span>

                        {/* Tooltip para quando fechado */}
                        {!isOpen && (
                            <div className="absolute left-20 bg-slate-800 text-white text-sm px-2 py-1 rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50">
                                {item.label}
                            </div>
                        )}
                    </NavLink>
                ))}
            </nav>

            {/* Footer Info */}
            <div className={`p-4 border-t border-slate-700 text-slate-500 text-xs text-center overflow-hidden whitespace-nowrap ${!isOpen && 'hidden'}`}>
                &copy; 2024 QualyBuss
            </div>
        </div>
    );
};

export default Sidebar;
