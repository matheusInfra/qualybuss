import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase'; // Importação do cliente

const Login = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errorMsg, setErrorMsg] = useState('');

  // Função para atualizar o estado conforme o usuário digita
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      // Chamada ao Supabase para autenticação
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) {
        // Tratamento de erros específicos para melhor UX
        if (error.message.includes('Invalid login credentials')) {
          setErrorMsg('E-mail ou senha incorretos. Verifique seus dados.');
        } else if (error.message.includes('Network')) {
          setErrorMsg('Erro de conexão. Verifique sua internet.');
        } else {
          setErrorMsg(error.message);
        }
        return;
      }

      // Se o login for bem-sucedido
      console.log("Login realizado com sucesso:", data.user.email);
      navigate('/dashboard');
      
    } catch (error) {
      setErrorMsg('Ocorreu um erro inesperado. Tente novamente mais tarde.');
      console.error('Erro crítico no login:', error);
    } finally {
      setLoading(false);
    }
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

        {/* Exibição de mensagens de erro dinâmicas */}
        {errorMsg && (
          <div className="mb-4 p-3 bg-red-100 border border-red-200 text-red-700 rounded-lg text-sm text-center animate-pulse">
            {errorMsg}
          </div>
        )}

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
            <input 
              name="email"
              type="email" 
              required
              value={formData.email}
              onChange={handleChange}
              disabled={loading}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-50"
              placeholder="exemplo@qualybuss.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Senha</label>
            <input 
              name="password"
              type="password" 
              required
              value={formData.password}
              onChange={handleChange}
              disabled={loading}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-50"
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className={`w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition-all shadow-lg flex items-center justify-center gap-2 ${
              loading ? 'opacity-70 cursor-not-allowed' : 'active:scale-[0.98]'
            }`}
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Autenticando...
              </>
            ) : (
              'Entrar no Sistema'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;