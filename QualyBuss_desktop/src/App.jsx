// src/App.jsx
import { AppRoutes } from './routes';
import { AuthProvider } from './contexts/AuthContext'; // Importação necessária

function App() {
  return (
    <AuthProvider> 
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;