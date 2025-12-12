import React from 'react';
import { useNavigate } from 'react-router-dom';

// Estilos CSS simples (não precisamos de um arquivo .css só para isso)
const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '60vh',
    padding: '20px',
    textAlign: 'center',
    backgroundColor: '#fff',
    borderRadius: '8px',
  },
  title: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#E53E3E', // Vermelho
    marginBottom: '16px',
  },
  message: {
    fontSize: '16px',
    color: '#4a5568',
    marginBottom: '24px',
  },
  button: {
    padding: '10px 20px',
    fontSize: '15px',
    fontWeight: '600',
    border: '1px solid #ccc',
    borderRadius: '4px',
    cursor: 'pointer',
    backgroundColor: '#f8f9fa',
  }
};

function ErrorFallback({ error }) {
  const navigate = useNavigate();

  const handleReset = () => {
    // A forma mais simples de "resetar" o erro é 
    // navegar para a página inicial (o Dashboard).
    navigate('/');
    // Recarregar a página também funciona:
    // window.location.reload(); 
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Oops! Algo deu errado.</h2>
      <p style={styles.message}>
        Parece que esta seção do aplicativo falhou ao carregar. 
        Nossa equipe de engenharia já foi notificada.
      </p>
      <button style={styles.button} onClick={handleReset}>
        Voltar para o Início
      </button>
      
      {/* Mensagem de erro (apenas para desenvolvimento) */}
      {process.env.NODE_ENV === 'development' && (
        <pre style={{ marginTop: '20px', color: 'red', maxWidth: '800px', overflow: 'auto' }}>
          {error.message}
        </pre>
      )}
    </div>
  );
}

export default ErrorFallback;