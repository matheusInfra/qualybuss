// Arquivo: supabase/functions/chat-assistente/index.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'npm:@supabase/supabase-js@2'

Deno.serve(async (req) => {
  // CORS Setup
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' } })
  }

  try {
    const { prompt } = await req.json();
    const authHeader = req.headers.get('Authorization');

    if (!authHeader) {
      throw new Error("Usuário não autenticado.");
    }

    // 1. CRÍTICO: Usar client com contexto do usuário (Respeita RLS)
    // Não usamos mais a Service Role Key aqui para dados sensíveis
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // 2. Buscar contexto específico do usuário (e não 5 aleatórios)
    // Exemplo: Buscar apenas o próprio perfil ou dados permitidos pela RLS
    const { data: meusDados, error: dbError } = await supabaseClient
      .from('funcionarios')
      .select('nome_completo, cargo, departamento, salario_bruto') // Selecione apenas o necessário
      .limit(10); // A RLS vai filtrar quem esse usuário pode ver

    if (dbError) throw new Error(`Erro de permissão ou banco: ${dbError.message}`);

    const contexto = `
      Você é o QualyBot, assistente de RH.
      
      DADOS QUE O USUÁRIO TEM ACESSO (Contexto Seguro):
      ${JSON.stringify(meusDados, null, 2)}
      
      Pergunta do usuário: ${prompt}
    `;

    // 3. Chamada ao Gemini
    const geminiKey = Deno.env.get('GEMINI_API_KEY');
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: contexto }] }] }),
    });

    if (!response.ok) throw new Error(await response.text());

    const data = await response.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "Sem resposta da IA.";

    return new Response(JSON.stringify({ reply }), { 
      headers: { "Content-Type": "application/json", 'Access-Control-Allow-Origin': '*' } 
    });

  } catch (error) {
    return new Response(JSON.stringify({ reply: `Erro: ${error.message}` }), { 
      status: 500, 
      headers: { "Content-Type": "application/json", 'Access-Control-Allow-Origin': '*' } 
    });
  }
})