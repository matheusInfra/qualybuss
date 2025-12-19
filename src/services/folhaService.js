import { supabase } from './supabaseClient';

export const getCompetenciaAtual = async (mes, ano, empresaId) => {
  const { data, error } = await supabase
    .from('folha_competencias')
    .select('*')
    .eq('mes', mes)
    .eq('ano', ano)
    .eq('empresa_id', empresaId)
    .maybeSingle();
  if (error) throw error;
  return data;
};

export const abrirCompetencia = async (mes, ano, empresaId, listaFuncionarios) => {
  const { data: competencia, error: errComp } = await supabase
    .from('folha_competencias')
    .insert([{ mes, ano, empresa_id: empresaId, status: 'Aberta' }])
    .select()
    .single();
  
  if (errComp) throw errComp;

  const apontamentosIniciais = listaFuncionarios.map(func => ({
    competencia_id: competencia.id,
    funcionario_id: func.id
  }));

  const { error: errApont } = await supabase.from('folha_apontamentos').insert(apontamentosIniciais);
  if (errApont) throw errApont;

  return competencia;
};

export const getApontamentos = async (competenciaId) => {
  const { data, error } = await supabase
    .from('folha_apontamentos')
    .select('*, funcionario:funcionarios(id, nome_completo, cargo, salario_bruto, qtd_dependentes)')
    .eq('competencia_id', competenciaId)
    .order('funcionario(nome_completo)');
  if (error) throw error;
  return data;
};

export const salvarApontamento = async (id, campos) => {
  const { data, error } = await supabase
    .from('folha_apontamentos')
    .update(campos)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const fecharFolha = async (competenciaId, dadosProcessados) => {
  const historicoPayload = dadosProcessados.map(item => ({
    competencia_id: competenciaId,
    funcionario_id: item.funcionario.id,
    salario_base_snap: item.calculo.base.salario,
    total_proventos: item.calculo.totais.bruto,
    total_descontos: item.calculo.totais.descontos,
    salario_liquido_final: item.calculo.totais.liquido,
    custo_empresa_final: item.calculo.totais.custoEmpresa,
    memoria_calculo: item.calculo
  }));

  const { error: errHist } = await supabase.from('folha_historico').insert(historicoPayload);
  if (errHist) throw errHist;

  const totalLiq = dadosProcessados.reduce((acc, curr) => acc + curr.calculo.totais.liquido, 0);
  const totalCusto = dadosProcessados.reduce((acc, curr) => acc + curr.calculo.totais.custoEmpresa, 0);

  const { error: errUpd } = await supabase
    .from('folha_competencias')
    .update({ status: 'Fechada', data_fechamento: new Date(), total_liquido: totalLiq, total_custo_empresa: totalCusto })
    .eq('id', competenciaId);

  if (errUpd) throw errUpd;
  return true;
};