import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../Sidebar';

const Layout = () => {
    return (
        <div className="flex overflow-hidden h-screen bg-slate-100">
            <Sidebar />
            <main className="flex-1 overflow-y-auto overflow-x-hidden p-6 relative">
                <Outlet />
            </main>
        </div>
    );
};

export default Layout;
