import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './app.jsx'

// 1. Você IMPORTA o "envolvedor" (o Provedor) do seu arquivo de Contexto
// (Baseado no seu arquivo AuthContext.jsx)
import { AuthProvider } from './contexts/AuthContext.jsx' 

// 2. Você renderiza o app
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    
    {/* 3. AQUI ESTÁ A MÁGICA:
      Isto é "envolver o projeto". 
      Você coloca o <AuthProvider> por FORA do <App />.
      Agora, o <App /> e todos os seus filhos (Layout, Páginas, etc.)
      estão "dentro" do provedor e podem perguntar "o usuário está logado?".
    */}
    <AuthProvider>
      <App />
    </AuthProvider>
    
  </React.StrictMode>,
)