import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'npm:@supabase/supabase-js@2'

Deno.serve(async (req) => {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' } })
  }

  try {
    const { prompt, history } = await req.json();
    const authHeader = req.headers.get('Authorization');

    if (!authHeader) throw new Error("Usuário não autenticado.");

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // 1. Busca Configuração da IA (Personalidade)
    const { data: configIA } = await supabaseClient
      .from('configuracoes_ia')
      .select('system_instruction, temperature, model_name')
      .maybeSingle();

    // 2. Busca Dados Agregados Reais (RPC) - O Cérebro Financeiro
    const { data: resumoDados, error: rpcError } = await supabaseClient
      .rpc('get_resumo_geral_ia');

    if (rpcError) console.error("Erro RPC:", rpcError);

    // 3. Monta o Contexto do Sistema
    const dataAtual = new Date().toLocaleDateString('pt-BR');
    
    const systemContext = `
      INSTRUÇÃO MESTRE: ${configIA?.system_instruction || 'Você é um assistente de RH analítico.'}
      
      DATA DE HOJE: ${dataAtual}
      
      DADOS REAIS DA EMPRESA (Use para cálculos):
      ${JSON.stringify(resumoDados || {}, null, 2)}
      
      REGRAS:
      1. Use 'folha_pagamento_mensal' para previsões de custos.
      2. Use 'distribuicao_departamento' para análises setoriais.
      3. Se o usuário enviou texto de arquivo (PDF/CSV), analise-o com prioridade.
      4. Use Markdown.
    `;

    // 4. Payload para o Gemini (Histórico + Contexto)
    const contents = [
        { role: 'user', parts: [{ text: `CONTEXTO DO SISTEMA:\n${systemContext}` }] },
        { role: 'model', parts: [{ text: "Entendido. Acesso aos dados confirmado." }] },
        ...(history || []),
        { role: 'user', parts: [{ text: prompt }] }
    ];

    const geminiKey = Deno.env.get('GEMINI_API_KEY');
    const modelName = configIA?.model_name || 'gemini-2.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: contents,
        generationConfig: {
          temperature: configIA?.temperature || 0.4,
          maxOutputTokens: 1000,
        }
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API Error: ${errText}`);
    }

    const data = await response.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "Sem resposta.";

    return new Response(JSON.stringify({ reply }), { 
      headers: { "Content-Type": "application/json", 'Access-Control-Allow-Origin': '*' } 
    });

  } catch (error) {
    return new Response(JSON.stringify({ reply: `Erro no processamento: ${error.message}` }), { 
      status: 500, 
      headers: { "Content-Type": "application/json", 'Access-Control-Allow-Origin': '*' } 
    });
  }
})