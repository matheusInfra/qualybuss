import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import "./LoginPage.css";

function LoginPage() {
  // ... estados existentes
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // NOVO ESTADO: Controla se mostra Login ou Recuperação
  const [isRecovering, setIsRecovering] = useState(false);
  const [message, setMessage] = useState(null); // Mensagem de sucesso

  const { signIn, resetPassword } = useAuth(); // Importe resetPassword
  const navigate = useNavigate();

  // Função Original de Login
  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error } = await signIn(email, password);
      if (error) throw error;
      navigate("/");
    } catch (err) {
      setError("Falha ao fazer login. Verifique suas credenciais.");
    } finally {
      setLoading(false);
    }
  };

  // Nova Função de Recuperação
  const handleRecovery = async (e) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      const { error } = await resetPassword(email);
      if (error) throw error;
      setMessage("Se o e-mail existir, você receberá um link em instantes.");
      // Opcional: voltar para login após alguns segundos ou manter na tela
    } catch (err) {
      setError("Erro ao solicitar recuperação: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
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
              ? "Informe seu e-mail para receber as instruções." 
              : "A saúde do seu negócio é nossa responsabilidade."}
          </p>

          {/* Renderização Condicional do Formulário */}
          <form onSubmit={isRecovering ? handleRecovery : handleLogin} className="form">
            
            <label className="input-label">
              E-mail
              <div className="input-container">
                <span className="material-symbols-outlined input-icon">person</span>
                <input
                  type="email"
                  placeholder="Digite seu e-mail"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </label>

            {/* Campo de Senha só aparece se NÃO estiver recuperando */}
            {!isRecovering && (
              <label className="input-label">
                Senha
                <div className="input-container">
                  <span className="material-symbols-outlined input-icon">lock</span>
                  <input
                    type="password"
                    placeholder="Digite sua senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </label>
            )}

            {error && <p className="error-message" style={{color: 'red', marginTop: '10px'}}>{error}</p>}
            {message && <p className="success-message" style={{color: 'green', marginTop: '10px'}}>{message}</p>}

            {!isRecovering && (
              <div className="form-options">
                <label className="remember">
                  <input type="checkbox" />
                  <span>Lembrar-me</span>
                </label>

                <button 
                  type="button" 
                  className="forgot" 
                  onClick={() => {
                    setIsRecovering(true);
                    setError(null);
                    setMessage(null);
                  }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  Esqueceu sua senha?
                </button>
              </div>
            )}

            <button type="submit" disabled={loading} className="submit-btn">
              {loading ? "Processando..." : (isRecovering ? "Enviar Link" : "Entrar")}
            </button>

            {isRecovering && (
              <button 
                type="button" 
                className="submit-btn" 
                style={{ backgroundColor: 'transparent', color: '#666', border: '1px solid #ddd', marginTop: '10px' }}
                onClick={() => {
                    setIsRecovering(false);
                    setError(null);
                    setMessage(null);
                }}
              >
                Voltar para Login
              </button>
            )}

          </form>
        </div>
      </div>
      {/* Lado direito mantém igual */}
      <div className="login-right">
        {/* ... conteúdo igual ... */}
      </div>
    </div>
  );
}

export default LoginPage;