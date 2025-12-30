import React from 'react';

const Dashboard = () => {
    return (
        <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center animate-fade-in-up">
            <div className="bg-white p-10 rounded-3xl shadow-xl max-w-2xl w-full">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                </div>
                <h1 className="text-3xl font-extrabold text-slate-800 mb-2">Dashboard</h1>
                <p className="text-xl text-slate-500 font-medium">Módulo em Construção...</p>
                <div className="mt-8 flex justify-center">
                    <div className="h-2 w-32 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-600 w-1/3 animate-[shimmer_2s_infinite]"></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
