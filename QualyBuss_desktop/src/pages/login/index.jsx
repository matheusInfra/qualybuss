import React from 'react';
import { useNavigate } from 'react-router-dom'; // 1. Adicionar import

const Login = () => {
  const navigate = useNavigate(); // 2. Inicializar o hook

  const handleSubmit = (e) => {
    e.preventDefault();
    // No futuro, aqui você faria a chamada à API de autenticação
    navigate('/dashboard'); // 3. Navegar para a rota configurada
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-slate-800">
            Qualy<span className="text-blue-600">Buss</span>
          </h1>
          <p className="text-slate-500 mt-2">Acesse sua conta para gerenciar a frota</p>
        </div>

        {/* 4. Adicionar o onSubmit no form */}
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
            <input 
              type="email" 
              required
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="exemplo@qualybuss.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Senha</label>
            <input 
              type="password" 
              required
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit" 
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition-all shadow-lg"
          >
            Entrar no Sistema
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;