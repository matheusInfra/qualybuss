import { createClient } from '@supabase/supabase-js';

const envUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!envUrl || !supabaseAnonKey) {
  throw new Error("Supabase URL ou Anon Key não definidos no .env");
}

// CORREÇÃO: O Supabase exige URL absoluta (http/https).
// Se estivermos usando o proxy relativo (/api-supa), montamos a URL completa
// usando a origem atual do navegador.
const supabaseUrl = envUrl.startsWith('/') 
  ? `${window.location.origin}${envUrl}` 
  : envUrl;

const options = {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, options);