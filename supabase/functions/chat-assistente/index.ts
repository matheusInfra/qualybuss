import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'npm:@supabase/supabase-js@2'

Deno.serve(async (req) => {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' } })
  }

  try {
    // 1. Verificação de Variáveis
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'); // PRECISA ser a Service Role, não a Anon
    const geminiKey = Deno.env.get('GEMINI_API_KEY');

    // Debug: Mostra no log quais chaves foram carregadas (mas esconde o valor por segurança)
    console.log("--- INICIANDO DIAGNÓSTICO ---");
    console.log("URL:", supabaseUrl || "NÃO DEFINIDA");
    console.log("Service Key:", supabaseKey ? "OK (Carregada)" : "NÃO DEFINIDA");
    console.log("Gemini Key:", geminiKey ? "OK (Carregada)" : "NÃO DEFINIDA");

    if (!supabaseUrl || !supabaseKey || !geminiKey) {
      throw new Error(`Faltam variáveis no .env do Docker! URL: ${!!supabaseUrl}, Key: ${!!supabaseKey}, Gemini: ${!!geminiKey}`);
    }

    // 2. Teste de Conexão com o Banco
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Tenta buscar funcionários (Teste real de acesso)
    const { data: funcionarios, error: dbError } = await supabase
      .from('funcionarios')
      .select('nome_completo, cargo, departamento')
      .limit(5);

    if (dbError) {
      console.error("ERRO DE BANCO:", dbError);
      throw new Error(`Erro ao conectar no banco: ${dbError.message} (Code: ${dbError.code})`);
    }

    console.log("Dados recuperados com sucesso:", funcionarios?.length, "registros.");

    // Se chegou até aqui, o banco funcionou! Vamos montar o prompt.
    const { prompt } = await req.json();

    const contexto = `
      Você é o QualyBot, assistente de RH.
      
      DADOS REAIS DO SISTEMA (Use APENAS estes dados para responder sobre pessoas):
      ${JSON.stringify(funcionarios, null, 2)}
      
      Pergunta do usuário: ${prompt}
    `;

    // 3. Chamada ao Gemini
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: contexto }] }]
      }),
    });

    if (!response.ok) {
      const errTxt = await response.text();
      throw new Error(`Erro no Gemini: ${errTxt}`);
    }

    const data = await response.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "Sem resposta da IA.";

    return new Response(
      JSON.stringify({ reply }),
      { headers: { "Content-Type": "application/json", 'Access-Control-Allow-Origin': '*' } }
    );

  } catch (error) {
    console.error("ERRO FATAL:", error);
    // [MODO DEBUG] Retorna o erro na tela para você ver
    return new Response(
      JSON.stringify({ reply: `⚠️ ERRO TÉCNICO: ${error.message}` }),
      { status: 200, headers: { "Content-Type": "application/json", 'Access-Control-Allow-Origin': '*' } }
    );
  }
})