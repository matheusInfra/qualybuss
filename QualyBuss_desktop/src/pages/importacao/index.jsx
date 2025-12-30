import React from 'react';

const Importacao = () => {
    return (
        <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center animate-fade-in-up">
            <div className="bg-white p-10 rounded-3xl shadow-xl max-w-2xl w-full">
                <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                </div>
                <h1 className="text-3xl font-extrabold text-slate-800 mb-2">Importação</h1>
                <p className="text-xl text-slate-500 font-medium">Módulo em Construção...</p>
                <div className="mt-8 flex justify-center">
                    <div className="h-2 w-32 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-orange-600 w-1/3 animate-[shimmer_2s_infinite]"></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Importacao;
