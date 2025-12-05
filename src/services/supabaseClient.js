import { createClient } from '@supabase/supabase-js';

const envUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!envUrl || !supabaseAnonKey) {
  throw new Error("Supabase URL ou Anon Key não definidos no .env");
}

// CORREÇÃO CRÍTICA:
// O Supabase exige uma URL absoluta (http://...).
// Se o .env estiver usando o proxy ("/api-supa"), nós montamos a URL completa dinamicamente
// usando a origem atual do navegador (ex: https://192.168.x.x:5173).
const supabaseUrl = envUrl.startsWith('/') 
  ? `${window.location.origin}${envUrl}` 
  : envUrl;

// Opções adicionais para garantir estabilidade na conexão
const options = {
  auth: {
    persistSession: true, // Mantém o usuário logado
    autoRefreshToken: true, // Renova o token automaticamente
  },
  // Configuração global de headers (opcional, mas ajuda em alguns proxies)
  global: {
    headers: { 'x-application-name': 'qualybuss' },
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, options);