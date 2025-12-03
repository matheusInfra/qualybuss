import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext"; //
import "./LoginPage.css"; //

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // Estados de Interface
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null); // Para feedback de sucesso
  const [loading, setLoading] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false); // Alterna entre Login e Recuperação
  const [cooldown, setCooldown] = useState(0); // Temporizador em segundos

  const { signIn, resetPassword } = useAuth();
  const navigate = useNavigate();

  // Efeito para gerenciar a contagem regressiva (Anti-Spam)
  useEffect(() => {
    let timer;
    if (cooldown > 0) {
      timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [cooldown]);

  // Função de Login (Padrão)
  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error } = await signIn(email, password);
      if (error) throw error;
      navigate("/"); // Redireciona para o Dashboard
    } catch (err) {
      setError("Falha ao entrar. Verifique seu e-mail e senha.");
    } finally {
      setLoading(false);
    }
  };

  // Função de Recuperação de Senha (Com Cooldown)
  const handleRecovery = async (e) => {
    e.preventDefault();
    
    if (cooldown > 0) return; // Bloqueia clique duplo ou spam

    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      // O resetPassword já foi configurado no AuthContext atualizado
      const { error } = await resetPassword(email);
      if (error) throw error;

      setMessage("Instruções enviadas! Verifique sua caixa de entrada (e spam).");
      setCooldown(60); // Ativa espera de 60 segundos
    } catch (err) {
      setError("Não foi possível enviar o e-mail: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Alternar modos limpa os erros
  const toggleMode = () => {
    setIsRecovering(!isRecovering);
    setError(null);
    setMessage(null);
  };

  return (
    <div className="login-wrapper">

      {/* LADO ESQUERDO: Formulário */}
      <div className="login-left">
        <div className="login-box">

          <div className="brand">
            <span className="material-symbols-outlined brand-icon">donut_large</span>
            <h1 className="brand-name">QualyBuss</h1>
          </div>

          <h1 className="title">
            {isRecovering ? "Recuperar Senha" : "Bem-vindo(a) de volta"}
          </h1>
          <p className="subtitle">
            {isRecovering 
              ? "Informe seu e-mail para receber o link de redefinição." 
              : "A saúde do seu negócio é nossa responsabilidade."}
          </p>

          <form onSubmit={isRecovering ? handleRecovery : handleLogin} className="form">
            
            <label className="input-label">
              E-mail
              <div className="input-container">
                <span className="material-symbols-outlined input-icon">mail</span>
                <input
                  type="email"
                  placeholder="exemplo@qualybuss.com.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </label>

            {/* Campo de Senha (Apenas no Login) */}
            {!isRecovering && (
              <label className="input-label">
                Senha
                <div className="input-container">
                  <span className="material-symbols-outlined input-icon">lock</span>
                  <input
                    type="password"
                    placeholder="Sua senha segura"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </label>
            )}

            {/* Mensagens de Feedback */}
            {error && (
              <div className="feedback-message error">
                <span className="material-symbols-outlined">error</span>
                {error}
              </div>
            )}
            
            {message && (
              <div className="feedback-message success">
                <span className="material-symbols-outlined">check_circle</span>
                {message}
              </div>
            )}

            {/* Opções (Esqueci senha / Lembrar) */}
            {!isRecovering && (
              <div className="form-options">
                <label className="remember">
                  <input type="checkbox" />
                  <span>Lembrar-me</span>
                </label>

                <button 
                  type="button" 
                  className="forgot-link" 
                  onClick={toggleMode}
                >
                  Esqueceu sua senha?
                </button>
              </div>
            )}

            {/* Botão Principal */}
            <button 
              type="submit" 
              disabled={loading || (isRecovering && cooldown > 0)} 
              className={`submit-btn ${cooldown > 0 && isRecovering ? 'disabled' : ''}`}
            >
              {loading 
                ? "Processando..." 
                : isRecovering 
                  ? (cooldown > 0 ? `Aguarde ${cooldown}s para reenviar` : "Enviar Link")
                  : "Entrar na Conta"
              }
            </button>

            {/* Botão Voltar (Apenas na Recuperação) */}
            {isRecovering && (
              <button 
                type="button" 
                className="back-btn" 
                onClick={toggleMode}
              >
                Voltar para o Login
              </button>
            )}

          </form>
        </div>
      </div>

      {/* LADO DIREITO: Decorativo */}
      <div className="login-right">
        <div className="overlay"></div>
        <div className="right-content">
          <h2>Gestão Inteligente</h2>
          <p>Equilíbrio e produtividade para sua equipe em um só lugar.</p>
        </div>
      </div>

    </div>
  );
}

export default LoginPage;