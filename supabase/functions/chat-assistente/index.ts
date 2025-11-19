// supabase/functions/chat-assistente/index.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

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

Se perguntarem quem é você, diga que é o QualyBot alimentado pelo Gemini 2.5 Flash.
`;

Deno.serve(async (req) => {
  // 1. Configuração de CORS
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
    if (!apiKey) throw new Error("Chave de API não configurada.");

    const { prompt } = await req.json()

    // --- MODELO CONFIRMADO PELA SUA LISTA ---
    const modelName = 'gemini-2.5-flash'; 
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        systemInstruction: {
          parts: [{ text: SYSTEM_INSTRUCTION }]
        },
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 500,
        }
      }),
    })

    if (!response.ok) {
      const errorText = await response.text();
      // Se der erro, mostra exatamente o que o Google disse
      throw new Error(`Google API Error (${modelName}): ${response.status} - ${errorText}`);
    }

    const data = await response.json()
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "Desculpe, não consegui gerar uma resposta.";

    return new Response(
      JSON.stringify({ reply }),
      { headers: { "Content-Type": "application/json", 'Access-Control-Allow-Origin': '*' } },
    )

  } catch (error) {
    console.error("ERRO FATAL:", error);
    
    return new Response(
      JSON.stringify({ 
        reply: `ERRO TÉCNICO: ${error.message}` 
      }),
      { 
        // Mantendo status 200 para exibir o erro no balão do chat, se houver
        status: 200, 
        headers: { "Content-Type": "application/json", 'Access-Control-Allow-Origin': '*' } 
      },
    )
  }
})