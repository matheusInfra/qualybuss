// supabase/functions/chat-assistente/index.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'npm:@supabase/supabase-js@2'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' } })
  }

  try {
    const { history } = await req.json(); // Recebe o histórico
    const authHeader = req.headers.get('Authorization');

    if (!authHeader) throw new Error("Usuário não autenticado.");

    // Cliente Supabase
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // 1. Buscar Configuração da IA (Personalidade)
    const { data: configIA } = await supabaseClient
      .from('configuracoes_ia')
      .select('system_instruction, temperature, model_name')
      .single();

    // 2. Buscar Dados Agregados (KPIs e Totais) via RPC
    const { data: resumoDados, error: rpcError } = await supabaseClient
      .rpc('get_resumo_geral_ia');

    // 3. Buscar Lista Detalhada (Ainda útil, mas limitada)
    const { data: funcionarios } = await supabaseClient
      .from('funcionarios')
      .select('nome_completo, cargo, departamento, salario_bruto, data_admissao')
      .eq('status', 'Ativo')
      .limit(30); // Aumentei um pouco, mas o RPC acima é o mais importante

    if (rpcError) console.error("Erro RPC:", rpcError);

    // Montagem do Contexto do Sistema
    const dataAtual = new Date().toLocaleDateString('pt-BR');
    
    const systemPrompt = `
      ${configIA?.system_instruction || 'Você é um assistente de RH analítico.'}
      
      DATA DE HOJE: ${dataAtual}
      
      DADOS FINANCEIROS E ESTRATÉGICOS (Use para cálculos):
      ${JSON.stringify(resumoDados, null, 2)}
      
      LISTA DE COLABORADORES (Amostra):
      ${JSON.stringify(funcionarios, null, 2)}
      
      REGRAS:
      1. Se o usuário pedir previsões (ex: "E se aumentarmos 10%?"), calcule com base no 'total_folha_mensal' dos dados financeiros.
      2. Seja conciso. Use Markdown para tabelas e negrito.
      3. Se a pergunta for sobre alguém que não está na lista de amostra, avise que está analisando apenas uma amostra, mas use os dados agregados para responder sobre o departamento.
    `;

    // 4. Chamada ao Gemini com Histórico
    const geminiKey = Deno.env.get('GEMINI_API_KEY');
    const model = configIA?.model_name || 'gemini-2.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
    
    // Prepara payload do Gemini
    // System Instruction vai separado no v1beta models, ou como primeira mensagem user/model dependendo da API.
    // Aqui injetaremos como system_instruction no corpo se suportado, ou primeira mensagem.
    
    const finalContents = [
        { role: 'user', parts: [{ text: `INSTRUÇÕES DO SISTEMA:\n${systemPrompt}` }] }, // Injeta contexto inicial
        { role: 'model', parts: [{ text: "Entendido. Tenho acesso aos dados financeiros e de pessoal. Estou pronto." }] },
        ...history // Histórico da conversa atual
    ];

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: finalContents,
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