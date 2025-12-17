import { createClient } from '@supabase/supabase-js';

const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const realUrl = import.meta.env.VITE_SUPABASE_URL;

if (!realUrl || !supabaseAnonKey) {
  throw new Error("Supabase URL ou Anon Key não definidos no .env");
}

// CORREÇÃO CRÍTICA:
// O Supabase exige URL absoluta. Em desenvolvimento, pegamos a origem atual (ex: http://localhost:5173)
// e adicionamos o sufixo do proxy.
const supabaseUrl = import.meta.env.DEV 
  ? `${window.location.origin}/api-supa` 
  : realUrl;

const options = {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, options);