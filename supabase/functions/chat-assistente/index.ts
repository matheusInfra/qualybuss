// supabase/functions/chat-assistente/index.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

// Contexto do sistema (O conhecimento do QualyBot)
const SYSTEM_INSTRUCTION = `
Você é o QualyBot, o assistente virtual oficial do sistema QualyBuss.
Seu objetivo é ajudar gestores e RH a usarem o sistema.
Responda sempre de forma curta, educada e em Português do Brasil.

Conhecimento sobre o sistema:
1. **Dashboard**: Mostra KPIs e gráficos de ausências.
2. **Colaboradores**: Menu para cadastrar (+ Adicionar), editar e listar funcionários. Obrigatório: CPF, Cargo, E-mail.
3. **Ausências**:
   - Use "Novo Lançamento" > "Débito" para faltas/atestados.
   - Use "Novo Lançamento" > "Crédito" para adicionar folgas ou Banco de Horas.
   - O saldo é calculado automaticamente no "Painel de Saldos".
4. **Documentos**: Upload de arquivos (PDF/Img) no perfil do colaborador.
5. **Movimentações**: Histórico de promoções e alterações salariais.

Se perguntarem quem é você, diga que é o QualyBot alimentado pelo Gemini.
`;

Deno.serve(async (req) => {
  // 1. Configuração de CORS (Permite acesso do seu Front-end)
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    const { prompt } = await req.json()

    // 2. Chamada para a API do Gemini (Modelo Flash é rápido e eficiente)
    // Documentação: https://ai.google.dev/gemini-api/docs/text-generation
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }] // A pergunta do usuário
        }],
        systemInstruction: {
          parts: [{ text: SYSTEM_INSTRUCTION }] // O "cérebro" do bot
        },
        generationConfig: {
          temperature: 0.4, // Criatividade controlada
          maxOutputTokens: 500,
        }
      }),
    })

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Erro Gemini API: ${errorData}`);
    }

    const data = await response.json()
    
    // 3. Extrair a resposta do JSON complexo do Gemini
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "Desculpe, não consegui gerar uma resposta.";

    return new Response(
      JSON.stringify({ reply }),
      { headers: { "Content-Type": "application/json", 'Access-Control-Allow-Origin': '*' } },
    )

  } catch (error) {
    console.error("Erro na Edge Function:", error);
    return new Response(
      JSON.stringify({ error: error.message, reply: "Erro técnico ao contatar o QualyBot." }),
      { status: 500, headers: { "Content-Type": "application/json", 'Access-Control-Allow-Origin': '*' } },
    )
  }
})