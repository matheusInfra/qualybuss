import React, { Suspense } from 'react'; // 1. Importe o Suspense
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext.jsx';

// 2. Importe o Layout e o Login normalmente
import Layout from './components/Layout/Layout.jsx';
import LoginPage from './pages/LoginPage.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';


// 3. IMPORTE AS PÁGINAS DO LAYOUT COM React.lazy()
const DashboardPage = React.lazy(() => import('./pages/DashboardPage.jsx'));
const FuncionariosPage = React.lazy(() => import('./pages/FuncionariosPage.jsx'));
const FuncionarioForm = React.lazy(() => import('./pages/FuncionarioForm.jsx'));
const AusenciasPage = React.lazy(() => import('./pages/AusenciasPage.jsx'));
const DocumentosPage = React.lazy(() => import('./pages/DocumentosPage.jsx'));
const MovimentacoesPage = React.lazy(() => import('./pages/MovimentacoesPage.jsx'));
const DocumentoDetalhePage = React.lazy(() => import('./pages/DocumentoDetalhePage.jsx'));
const FeriasPage = React.lazy(() => import('./pages/FeriasPage.jsx'));

// Componente especial para redirecionar se já estiver logado
function PublicRouteWrapper({ children }) {
  const { session } = useAuth();
  return session ? <Navigate to="/" replace /> : children;
}

// Criação do roteador
const router = createBrowserRouter([
  {
    path: "/login",
    element: (
      <PublicRouteWrapper>
        <LoginPage />
      </PublicRouteWrapper>
    ),
  },
  {
    path: "/",
    element: <ProtectedRoute />,
    children: [
      {
        path: "/",
        element: <Layout />,
        children: [
          // 4. Envolva TODAS as rotas "lazy" com um <Suspense>
          //    Ele mostrará 'Carregando Página...' enquanto o JS da rota é baixado.
          {
            path: "/",
            element: (
              <Suspense fallback={<p>Carregando Página...</p>}>
                <DashboardPage />
              </Suspense>
            ),
          },
          {
            path: "/funcionarios",
            element: (
              <Suspense fallback={<p>Carregando Página...</p>}>
                <FuncionariosPage />
              </Suspense>
            ),
          },
          {
            path: "/ferias",
            element: (
              <Suspense fallback={<p>Carregando Calendário...</p>}>
                <FeriasPage />
              </Suspense>
            ),
          },
          {
            path: "/funcionarios/novo",
            element: (
              <Suspense fallback={<p>Carregando Página...</p>}>
                <FuncionarioForm />
              </Suspense>
            ),
          },
          {
            path: "/funcionarios/editar/:id",
            element: (
              <Suspense fallback={<p>Carregando Página...</p>}>
                <FuncionarioForm />
              </Suspense>
            ),
          },
          {
            path: "/ausencias",
            element: (
              <Suspense fallback={<p>Carregando Página...</p>}>
                <AusenciasPage />
              </Suspense>
            ),
          },
          {
            path: "/documentos",
            element: (
              <Suspense fallback={<p>Carregando Página...</p>}>
                <DocumentosPage />
              </Suspense>
            ),
          },
          {
            path: "/documentos/:id", // O :id é o ID do funcionário
            element: (
              <Suspense fallback={<p>Carregando Página...</p>}>
                <DocumentoDetalhePage />
              </Suspense>
            ),
          },
          {
            path: "/movimentacoes",
            element: (
              <Suspense fallback={<p>Carregando Página...</p>}>
                <MovimentacoesPage />
              </Suspense>
            ),
          },
        ],
      },
    ],
  },
]);

// Componente principal
function App() {
  return <RouterProvider router={router} />;
}

export default App;