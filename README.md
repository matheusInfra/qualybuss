# Qualybuss

Sistema de gestão empresarial focado em RH e Departamento Pessoal, desenvolvido com React e Supabase.

## 🚀 Tecnologias

- **Frontend:** React 19, Vite
- **Linguagem:** JavaScript (ES Modules)
- **Estilização:** CSS Modules / Vanilla CSS
- **Roteamento:** React Router Dom v6
- **Gerenciamento de Estado:** Context API + SWR
- **Formulários:** React Hook Form + Zod
- **Backend/Banco de Dados:** Supabase
- **Outras Libs:** Recharts (Gráficos), React Big Calendar, PDF-Lib.

## 📦 Funcionalidades

O sistema conta com os seguintes módulos principais:

- **🔐 Autenticação:** Login seguro e proteção de rotas.
- **📊 Dashboard:** Visão geral com métricas e gráficos.
- **👥 Funcionários:** Cadastro completo, edição e listagem de colaboradores.
- **📅 Ausências:** Controle de faltas e justificativas.
- **🏖️ Férias:** Gestão de períodos de férias.
- **🔄 Movimentações:** Histórico de mudanças de cargo/setor.
- **📂 Documentos:** Gestão eletrônica de documentos (GED) com visualização e importação de PDFs.
- **⚙️ Configurações:** Ajustes gerais do sistema e da empresa.

## 🔧 Como Rodar o Projeto

1. **Instale as dependências:**
   ```bash
   npm install
   ```

2. **Configure as Variáveis de Ambiente:**
   Crie um arquivo `.env` na raiz do projeto com as credenciais do Supabase:
   ```env
   VITE_SUPABASE_URL=sua_url_aqui
   VITE_SUPABASE_ANON_KEY=sua_chave_aqui
   ```

3. **Rode o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```

4. **Acesse:**
   Abra `http://localhost:5173` no seu navegador.

## 🏗️ Estrutura do Projeto

- `src/pages`: Páginas da aplicação (rotas).
- `src/components`: Componentes reutilizáveis.
- `src/contexts`: Gerenciamento de estado global (Auth, Empresa).
- `src/services`: Comunicação com APIs e Supabase.
- `src/utils`: Funções auxiliares e validadores.
