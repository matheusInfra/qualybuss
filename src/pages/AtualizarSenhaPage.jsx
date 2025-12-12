import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import "./LoginPage.css"; // Reutilizando estilos

export default function AtualizarSenhaPage() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { updatePassword, session } = useAuth(); // session estará disponível pois o link faz o login automático
  const navigate = useNavigate();

  useEffect(() => {
    // Se por acaso o link for inválido ou o usuário não estiver logado, manda pro login
    if (!session) {
      // Opcional: navigate('/login');
    }
  }, [session, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await updatePassword(password);
      if (error) throw error;
      alert("Senha atualizada com sucesso!");
      navigate("/");
    } catch (err) {
      setError("Erro ao atualizar senha: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-left">
        <div className="login-box">
          <h1 className="title">Definir Nova Senha</h1>
          <form onSubmit={handleSubmit} className="form">
            <label className="input-label">
              Nova Senha
              <div className="input-container">
                <span className="material-symbols-outlined input-icon">lock</span>
                <input
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
            </label>
            {error && <p className="error-message">{error}</p>}
            <button type="submit" disabled={loading} className="submit-btn">
              {loading ? "Salvando..." : "Salvar Nova Senha"}
            </button>
          </form>
        </div>
      </div>
       <div className="login-right"></div>
    </div>
  );
}