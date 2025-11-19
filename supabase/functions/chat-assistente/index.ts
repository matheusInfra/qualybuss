import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'npm:@supabase/supabase-js@2'

Deno.serve(async (req) => {
  // Configuração de CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' } })
  }

  try {
    // 1. Credenciais
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const geminiKey = Deno.env.get('GEMINI_API_KEY');

    if (!geminiKey) throw new Error("Chave da IA não configurada no servidor.");

    // 2. Buscar "Cérebro" no Banco de Dados
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data: config, error: dbError } = await supabase
      .from('configuracoes_ia')
      .select('*')
      .limit(1)
      .maybeSingle();

    // Definição de valores (com fallback seguro caso o banco falhe momentaneamente)
    let systemInstruction = "Você é o assistente virtual QualyBot.";
    let modelName = 'gemini-2.5-flash'; // O modelo que validamos que funciona para você
    let temperature = 0.4;

    if (config) {
      systemInstruction = config.system_instruction;
      modelName = config.model_name;
      temperature = config.temperature;
    } else if (dbError) {
      console.error("Alerta: Falha ao ler configurações do banco:", dbError);
    }

    // 3. Preparar a requisição
    const { prompt } = await req.json();

    // 4. Chamar o Google Gemini
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        systemInstruction: { parts: [{ text: systemInstruction }] },
        generationConfig: { temperature: temperature, maxOutputTokens: 1000 }
      }),
    });

    if (!response.ok) {
      const errTxt = await response.text();
      console.error("Erro na API do Google:", errTxt); // Loga no painel do Supabase, não no chat
      throw new Error("O serviço de IA está indisponível no momento.");
    }

    const data = await response.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "Não consegui formular uma resposta.";

    // 5. Retornar a resposta limpa para o usuário
    return new Response(
      JSON.stringify({ reply }),
      { headers: { "Content-Type": "application/json", 'Access-Control-Allow-Origin': '*' } }
    );

  } catch (error) {
    console.error("ERRO CRÍTICO:", error);
    
    // Retorna uma mensagem amigável para o usuário final, sem expor detalhes técnicos
    return new Response(
      JSON.stringify({ reply: "Desculpe, estou passando por uma instabilidade técnica. Tente novamente em instantes." }),
      { status: 200, headers: { "Content-Type": "application/json", 'Access-Control-Allow-Origin': '*' } }
    );
  }
})