import React from 'react';

const Documentacao = () => {
    return (
        <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center animate-fade-in-up">
            <div className="bg-white p-10 rounded-3xl shadow-xl max-w-2xl w-full">
                <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                </div>
                <h1 className="text-3xl font-extrabold text-slate-800 mb-2">Documentação</h1>
                <p className="text-xl text-slate-500 font-medium">Módulo em Construção...</p>
                <div className="mt-8 flex justify-center">
                    <div className="h-2 w-32 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-purple-600 w-1/3 animate-[shimmer_2s_infinite]"></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Documentacao;
