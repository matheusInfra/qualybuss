import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'npm:@supabase/supabase-js@2'

Deno.serve(async (req) => {
  // Configuração de CORS para permitir requisições do front
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' } })
  }

  try {
    const { prompt, history } = await req.json();
    const authHeader = req.headers.get('Authorization');

    if (!authHeader) throw new Error("Usuário não autenticado.");

    // Cliente Supabase autenticado
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

    // 2. Busca Dados MACRO (RPC - Totais e Médias)
    const { data: resumoDados, error: rpcError } = await supabaseClient
      .rpc('get_resumo_geral_ia');

    if (rpcError) console.error("Erro RPC:", rpcError);

    // 3. Busca Dados MICRO (Lista de Funcionários Detalhada)
    // LIMITAÇÃO TÉCNICA: IAs têm limite de leitura. Buscamos os 100 primeiros ativos ou ordenados por salário.
    // Isso permite que ela responda perguntas específicas como "Qual o salário do João?".
    const { data: listaFuncionarios } = await supabaseClient
      .from('funcionarios')
      .select('nome_completo, cargo, departamento, salario_bruto, data_admissao, status')
      .eq('status', 'Ativo')
      .order('salario_bruto', { ascending: false }) // Prioriza maiores salários para análise de impacto
      .limit(100);

    // 4. Monta o "Cérebro" com todos os dados
    const dataAtual = new Date().toLocaleDateString('pt-BR');
    
    const systemContext = `
      === IDENTIDADE E REGRAS ===
      ${configIA?.system_instruction || 'Você é o QualyBot, um analista de RH sênior. Você tem acesso irrestrito aos dados abaixo para ajudar na gestão.'}
      
      DATA DE HOJE: ${dataAtual}
      
      === DADOS MACRO (ESTATÍSTICAS GERAIS) ===
      Use estes dados para perguntas sobre totais, médias e headcount.
      ${JSON.stringify(resumoDados || {}, null, 2)}
      
      === DADOS MICRO (LISTA DE COLABORADORES - AMOSTRA TOP 100) ===
      Use estes dados para perguntas sobre pessoas específicas, cargos ou comparações individuais.
      ${JSON.stringify(listaFuncionarios || [], null, 2)}
      
      === DIRETRIZES DE RESPOSTA ===
      1. Se perguntarem "Qual o impacto de aumentar 10%?", use o valor de 'folha_mensal' dos DADOS MACRO.
      2. Se perguntarem "Quem ganha mais?", olhe a LISTA DE COLABORADORES.
      3. Se o usuário mandar um ARQUIVO no texto, analise-o com prioridade máxima.
      4. Seja direto. Use Markdown e negrito para valores monetários (ex: **R$ 5.000,00**).
    `;

    // 5. Prepara Payload para o Gemini
    const contents = [
        { role: 'user', parts: [{ text: `INSTRUÇÃO DE SISTEMA E DADOS:\n${systemContext}` }] },
        { role: 'model', parts: [{ text: "Entendido. Tenho a visão completa dos dados macro e micro. Aguardo a pergunta." }] },
        ...(history || []),
        { role: 'user', parts: [{ text: prompt }] }
    ];

    const geminiKey = Deno.env.get('GEMINI_API_KEY');
    // Usa modelo configurado ou fallback para o flash (mais rápido)
    const modelName = configIA?.model_name || 'gemini-2.5-flash'; 
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: contents,
        generationConfig: {
          temperature: configIA?.temperature || 0.4,
          maxOutputTokens: 2000, // Aumentado para permitir análises longas
        }
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API Error: ${errText}`);
    }

    const data = await response.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "Sem resposta da IA.";

    return new Response(JSON.stringify({ reply }), { 
      headers: { "Content-Type": "application/json", 'Access-Control-Allow-Origin': '*' } 
    });

  } catch (error) {
    return new Response(JSON.stringify({ reply: `Erro no processamento da IA: ${error.message}` }), { 
      status: 500, 
      headers: { "Content-Type": "application/json", 'Access-Control-Allow-Origin': '*' } 
    });
  }
})