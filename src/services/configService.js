import { supabase } from './supabaseClient';

// --- CONFIGURAÇÃO FISCAL (VIGÊNCIA) ---

export const getConfiguracaoVigente = async () => {
  // Busca a configuração onde vigencia_fim é nula (Atual)
  const { data, error } = await supabase
    .from('configuracoes_fiscais')
    .select(`
      *,
      tabelas_impostos (
        id, tipo, deducao_dependente,
        faixas_impostos ( * )
      )
    `)
    .is('vigencia_fim', null)
    .maybeSingle();

  if (error) throw error;
  return data;
};

export const criarNovaVigencia = async (dadosConfig, tabelas) => {
  // 1. Encerra vigência anterior (se houver)
  const hoje = new Date().toISOString().split('T')[0];
  await supabase
    .from('configuracoes_fiscais')
    .update({ vigencia_fim: hoje })
    .is('vigencia_fim', null);

  // 2. Cria nova config mestre
  const { data: novaConfig, error: erroConfig } = await supabase
    .from('configuracoes_fiscais')
    .insert([{ ...dadosConfig, vigencia_inicio: hoje, vigencia_fim: null }])
    .select()
    .single();

  if (erroConfig) throw erroConfig;

  // 3. Clona/Cria as tabelas de impostos (INSS/IRRF)
  for (const tab of tabelas) {
    const { data: novaTab, error: erroTab } = await supabase
      .from('tabelas_impostos')
      .insert([{ configuracao_fiscal_id: novaConfig.id, tipo: tab.tipo, deducao_dependente: tab.deducao_dependente }])
      .select()
      .single();

    if (erroTab) throw erroTab;

    // 4. Cria as faixas
    if (tab.faixas_impostos && tab.faixas_impostos.length > 0) {
      const faixasParaInserir = tab.faixas_impostos.map(f => ({
        tabela_id: novaTab.id,
        limite_inferior: f.limite_inferior,
        limite_superior: f.limite_superior,
        aliquota: f.aliquota,
        deducao: f.deducao
      }));
      await supabase.from('faixas_impostos').insert(faixasParaInserir);
    }
  }

  return novaConfig;
};

// --- EVENTOS DE FOLHA ---

export const getEventosFolha = async () => {
  const { data, error } = await supabase.from('eventos_folha').select('*').order('nome');
  if (error) throw error;
  return data;
};

export const saveEventoFolha = async (evento) => {
  // Upsert (Cria ou Atualiza baseado no ID)
  const { data, error } = await supabase.from('eventos_folha').upsert([evento]).select();
  if (error) throw error;
  return data[0];
};

// --- MANTÉM COMPATIBILIDADE (SISTEMA SIMPLES) ---
export const getSystemConfig = async (chave) => {
  const { data } = await supabase.from('configuracoes_sistema').select('conteudo').eq('chave', chave).maybeSingle();
  return data ? data.conteudo : null;
};

export const updateSystemConfig = async (chave, conteudo) => {
  await supabase.from('configuracoes_sistema').upsert({ chave, conteudo }).select();
};