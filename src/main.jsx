import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './app.jsx'
import './index.css' // Certifique-se de importar o CSS global se houver

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* Removido o AuthProvider daqui, pois já está no App.jsx */}
    <App />
  </React.StrictMode>,
)