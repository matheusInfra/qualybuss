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

    // 2. Conectar ao Banco
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { prompt } = await req.json();

    // =========================================================================
    // NOVO: Coleta de Dados (O Cérebro do Negócio)
    // Buscamos dados resumidos para dar contexto à IA sem gastar muitos tokens
    // =========================================================================
    
    // A. Busca Funcionários (Apenas dados não sensíveis)
    const { data: funcionarios } = await supabase
      .from('funcionarios')
      .select('nome_completo, cargo, departamento, status')
      .eq('status', 'Ativo') // Opcional: Apenas ativos
      .limit(50); // Limite para não estourar tokens se tiver mil funcionários

    // B. Busca KPIs básicos (Ex: total de ausências hoje)
    // (Opcional - pode adicionar depois)

    // Monta o contexto para a IA ler
    const contextoDados = `
      DADOS ATUAIS DA EMPRESA (Use estes dados para responder se perguntado):
      
      LISTA DE COLABORADORES:
      ${JSON.stringify(funcionarios)}
      
      INSTRUÇÕES DE SEGURANÇA:
      - Você tem acesso a essa lista acima.
      - Se perguntarem sobre salários, CPF ou dados pessoais, diga que não tem acesso a essas informações.
      - Responda de forma natural, como um assistente de RH prestativo.
    `;

    // =========================================================================

    // 3. Configurações da IA
    // Tenta pegar do banco, se não tiver, usa o padrão + nosso contexto
    const { data: config } = await supabase
      .from('configuracoes_ia')
      .select('*')
      .limit(1)
      .maybeSingle();

    let systemInstruction = "Você é o assistente virtual QualyBot.";
    let modelName = 'gemini-2.5-flash'; // Modelo rápido e barato
    let temperature = 0.4;

    if (config) {
      systemInstruction = config.system_instruction;
      modelName = config.model_name || 'gemini-2.5-flash';
      temperature = config.temperature;
    }

    // Combina a instrução fixa com os dados dinâmicos do banco
    const finalSystemInstruction = `${systemInstruction}\n\n${contextoDados}`;

    // 4. Chamar o Google Gemini
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        systemInstruction: { parts: [{ text: finalSystemInstruction }] }, // Envia o contexto aqui
        generationConfig: { temperature: temperature, maxOutputTokens: 1000 }
      }),
    });

    if (!response.ok) {
      const errTxt = await response.text();
      console.error("Erro na API do Google:", errTxt);
      throw new Error("O serviço de IA está indisponível no momento.");
    }

    const data = await response.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "Não consegui formular uma resposta.";

    return new Response(
      JSON.stringify({ reply }),
      { headers: { "Content-Type": "application/json", 'Access-Control-Allow-Origin': '*' } }
    );

  } catch (error) {
    console.error("ERRO NO CHAT:", error);
    return new Response(
      JSON.stringify({ reply: "Estou tendo dificuldades para acessar os dados agora. Tente novamente." }),
      { status: 200, headers: { "Content-Type": "application/json", 'Access-Control-Allow-Origin': '*' } }
    );
  }
})