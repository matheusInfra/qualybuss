import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import "./LoginPage.css";

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error } = await signIn(email, password);
      if (error) throw error;
      navigate("/");
    } catch (err) {
      setError(err.message || "Falha ao fazer login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">

      {/* LADO ESQUERDO */}
      <div className="login-left">
        <div className="login-box">

          <div className="brand">
            <span className="material-symbols-outlined brand-icon">donut_large</span>
            <h1 className="brand-name">QualyBuss</h1>
          </div>

          <h1 className="title">Bem-vindo(a) de volta</h1>
          <p className="subtitle">Á saúde do seu negócio é nossa responsabilidade.</p>

          <form onSubmit={handleSubmit} className="form">
            
            <label className="input-label">
              E-mail ou Usuário
              <div className="input-container">
                <span className="material-symbols-outlined input-icon">person</span>
                <input
                  type="email"
                  placeholder="Digite seu e-mail ou nome de usuário"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </label>

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

            {error && <p className="error-message">{error}</p>}

            <div className="form-options">
              <label className="remember">
                <input type="checkbox" />
                <span>Lembrar-me</span>
              </label>

              <a href="#" className="forgot">Esqueceu sua senha?</a>
            </div>

            <button type="submit" disabled={loading} className="submit-btn">
              {loading ? "Entrando..." : "Entrar"}
            </button>

          </form>
        </div>
      </div>

      {/* LADO DIREITO */}
      <div className="login-right">
        <div className="overlay"></div>
        <div className="right-content">
          <h2>Equilíbrio e produtividade em um só lugar.</h2>
          <p>Gerencie suas folgas com facilidade e mantenha sua equipe em sincronia.</p>
        </div>
      </div>

    </div>
  );
}

export default LoginPage;
