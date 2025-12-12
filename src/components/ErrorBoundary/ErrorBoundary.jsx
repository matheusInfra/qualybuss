import React from 'react';
import ErrorFallback from './ErrorFallback';

// Este componente DEVE ser um Componente de Classe.
// É a única forma de usar 'getDerivedStateFromError' e 'componentDidCatch'.

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    // O estado inicial: nenhum erro
    this.state = { hasError: false, error: null };
  }

  // 1. Atualiza o estado se um erro for lançado por um filho
  static getDerivedStateFromError(error) {
    // Retorna o novo estado para que o 'render()' mostre a UI de fallback
    return { hasError: true, error: error };
  }

  // 2. Captura os detalhes do erro (bom para logar em serviços como Sentry)
  componentDidCatch(error, errorInfo) {
    // Por enquanto, apenas logamos no console
    console.error("ErrorBoundary capturou um erro:", error, errorInfo);
    // Você poderia enviar isso para um serviço de log:
    // logErrorToMyService(error, errorInfo);
  }

  // 3. Renderiza a UI
  render() {
    if (this.state.hasError) {
      // Se houver um erro, renderiza nossa UI de fallback
      return <ErrorFallback error={this.state.error} />;
    }

    // Se não houver erro, renderiza os componentes "filhos"
    return this.props.children; 
  }
}

export default ErrorBoundary;