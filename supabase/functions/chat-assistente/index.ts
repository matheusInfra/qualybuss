import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'npm:@supabase/supabase-js@2'

Deno.serve(async (req) => {
  // 1. CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    // Variáveis automáticas do Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''; 
    // Nota: Usamos SERVICE_ROLE_KEY para a função ter permissão de ler a config sem precisar do usuário logado no contexto da DB

    if (!apiKey) throw new Error("Chave GEMINI_API_KEY não configurada.");

    // 2. Conectar ao Banco para pegar o "Cérebro" atual
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data: config, error: dbError } = await supabase
      .from('configuracoes_ia')
      .select('*')
      .limit(1)
      .single();

    if (dbError) {
      console.error("Erro ao buscar config:", dbError);
      throw new Error("Falha ao carregar configurações da IA.");
    }

    // Pega os dados do banco ou usa fallback se algo der errado
    const systemInstruction = config?.system_instruction || "Você é um assistente útil.";
    const temperature = config?.temperature ?? 0.4;
    const modelName = config?.model_name || 'gemini-1.5-flash-001';

    // 3. Pegar prompt do usuário
    const { prompt } = await req.json();

    // 4. Montar URL com o modelo escolhido no banco
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        systemInstruction: {
          parts: [{ text: systemInstruction }] // <--- AQUI ENTRA O SEU TREINAMENTO
        },
        generationConfig: {
          temperature: temperature, // <--- AQUI ENTRA A TEMPERATURA
          maxOutputTokens: 1000,
        }
      }),
    })

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Google API Error (${modelName}): ${response.status} - ${errorText}`);
    }

    const data = await response.json()
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "Sem resposta.";

    return new Response(
      JSON.stringify({ reply }),
      { headers: { "Content-Type": "application/json", 'Access-Control-Allow-Origin': '*' } },
    )

  } catch (error) {
    console.error("ERRO FATAL:", error);
    return new Response(
      JSON.stringify({ reply: `ERRO TÉCNICO: ${error.message}` }),
      { 
        status: 200, 
        headers: { "Content-Type": "application/json", 'Access-Control-Allow-Origin': '*' } 
      },
    )
  }
})