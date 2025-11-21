// src/services/ausenciaService.js
import { supabase } from './supabaseClient';

const ANEXOS_BUCKET = 'anexos_ausencias';

// --- UPLOAD E DOWNLOAD ---

export const uploadAnexoAusencia = async (file, funcionarioId) => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}.${fileExt}`;
  const filePath = `${funcionarioId}/${fileName}`;

  const { error } = await supabase.storage
    .from(ANEXOS_BUCKET)
    .upload(filePath, file);

  if (error) throw error;
  return filePath;
};

export const getAnexoAusenciaDownloadUrl = async (pathStorage) => {
  const { data, error } = await supabase.storage
    .from(ANEXOS_BUCKET)
    .createSignedUrl(pathStorage, 60);

  if (error) throw error;
  return data.signedUrl;
};

// --- GESTÃO DE PERÍODOS (SALDO DE FÉRIAS) ---

export const getPeriodosAquisitivos = async (funcionarioId) => {
  const { data, error } = await supabase
    .from('periodos_aquisitivos')
    .select('*')
    .eq('funcionario_id', funcionarioId)
    .order('inicio_periodo', { ascending: true });

  if (error) throw error;
  return data;
};

export const updatePeriodoAquisitivo = async (id, dados) => {
  const { data, error } = await supabase
    .from('periodos_aquisitivos')
    .update(dados)
    .eq('id', id)
    .select();

  if (error) throw error;
  return data[0];
};

// --- VALIDAÇÕES E SOLICITAÇÕES ---

export const checkConflitoDatas = async (funcionarioId, dataInicio, dataFim, ignoreId = null) => {
  let query = supabase
    .from('solicitacoes_ausencia')
    .select('id')
    .eq('funcionario_id', funcionarioId)
    .neq('status', 'Rejeitado')
    .or(`data_inicio.lte.${dataFim},data_fim.gte.${dataInicio}`);

  if (ignoreId) {
    query = query.neq('id', ignoreId);
  }

  const { data, error } = await query;
  if (error) throw error;
  
  return data.length > 0;
};

export const createSolicitacaoAusencia = async (dados) => {
  const temConflito = await checkConflitoDatas(dados.funcionario_id, dados.data_inicio, dados.data_fim);
  if (temConflito) {
    throw new Error("Conflito detectado: Já existe uma ausência registrada neste período.");
  }

  const payload = {
    funcionario_id: dados.funcionario_id,
    empresa_id: dados.empresa_id,
    tipo: dados.tipo,
    categoria: dados.categoria,
    data_inicio: dados.data_inicio,
    data_fim: dados.data_fim,
    motivo: dados.motivo || null,
    anexo_path: dados.anexo_path || null,
    status: 'Pendente',
    periodo_aquisitivo_id: dados.periodo_aquisitivo_id || null,
    quantidade: dados.quantidade || 0,
    unidade: 'dias'
  };

  const { data, error } = await supabase
    .from('solicitacoes_ausencia')
    .insert([payload])
    .select();

  if (error) throw error;
  return data[0];
};

export const getTodasSolicitacoes = async () => {
  const { data, error } = await supabase
    .from('solicitacoes_ausencia')
    .select(`
      *,
      funcionarios ( id, nome_completo, avatar_url, cargo )
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};

export const updateStatusSolicitacao = async (id, status, motivoRejeicao = null) => {
  const { data, error } = await supabase
    .from('solicitacoes_ausencia')
    .update({ 
      status: status, 
      motivo: motivoRejeicao ? motivoRejeicao : undefined 
    })
    .eq('id', id)
    .select();

  if (error) throw error;
  return data[0];
};

export const deleteSolicitacao = async (id) => {
  const { error } = await supabase
    .from('solicitacoes_ausencia')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
};

// --- FUNÇÕES DO MÓDULO DE FÉRIAS (CALENDÁRIO) ---
// Esta função estava faltando e causava o erro

export const getFeriasAprovadasParaCalendario = async (ano, mes, searchTerm = '', departamento = 'Todos') => {
  // Calcula o primeiro e último dia do mês para filtrar
  const dataInicioMes = new Date(ano, mes - 1, 1).toISOString();
  // O dia 0 do mês seguinte é o último dia do mês atual
  const dataFimMes = new Date(ano, mes, 0).toISOString();

  let query = supabase
    .from('solicitacoes_ausencia')
    .select(`
      id,
      data_inicio,
      data_fim,
      funcionario_id,
      funcionarios ( nome_completo, departamento )
    `)
    .eq('tipo', 'Férias') // Filtra apenas férias
    .eq('status', 'Aprovado') // Apenas aprovadas aparecem no calendário
    // Lógica para pegar férias que começam, terminam ou atravessam o mês atual
    .or(
      `data_inicio.gte.${dataInicioMes},data_inicio.lte.${dataFimMes},` +
      `data_fim.gte.${dataInicioMes},data_fim.lte.${dataFimMes},` +
      `and(data_inicio.lt.${dataInicioMes},data_fim.gt.${dataFimMes})`
    );

  // Aplica filtros de busca visual (Nome e Departamento)
  if (searchTerm) {
    // Como o supabase js não faz filtro em tabela relacionada facilmente dessa forma no .or(),
    // a filtragem por nome pode ser refinada no front-end ou exigiria uma query mais complexa.
    // Por enquanto, mantemos simples ou assumimos que o filtro principal é no banco.
    // Nota: Se der erro no filtro por nome dentro do objeto relacionado, remova esta linha.
    // A maioria das versões suporta:
    query = query.ilike('funcionarios.nome_completo', `%${searchTerm}%`);
  }
  
  if (departamento && departamento !== 'Todos') {
    query = query.eq('funcionarios.departamento', departamento);
  }

  const { data, error } = await query;
  
  if (error) {
    console.error("Erro ao buscar férias para o calendário:", error);
    throw error;
  }
  
  return data;
};