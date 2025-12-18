import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { IMaskInput } from 'react-imask';
import { cpf } from 'cpf-cnpj-validator';
import useSWR, { useSWRConfig } from 'swr';
import { toast } from 'react-hot-toast';
import { supabase } from '../services/supabaseClient';

// Services
import {
  getFuncionarioById,
  createFuncionario,
  updateFuncionario,
  deleteFuncionario,
} from '../services/funcionarioService';
import { getEmpresas } from '../services/empresaService';
import { getBancos } from '../services/bancoService';

// Componentes
import ModalConfirmacao from '../components/Modal/ModalConfirmacao';
import HistoricoMovimentacoes from '../components/HistoricoMovimentacoes';
import TimelineAuditoria from '../components/Auditoria/TimelineAuditoria';
import AvatarUpload from '../components/Upload/AvatarUpload';
import DocumentoUploadForm from '../components/Documentos/DocumentoUploadForm';

import './FuncionarioForm.css';

// --- MAPA DE NOMES AMIGÁVEIS PARA FEEDBACK ---
const friendlyNames = {
  nome_completo: 'Nome Completo',
  cpf: 'CPF',
  rg: 'RG',
  empresa_id: 'Empresa',
  cbo: 'CBO',
  cargo: 'Cargo',
  email_corporativo: 'E-mail Corporativo',
  salario_bruto: 'Salário Bruto',
  data_nascimento: 'Data de Nascimento',
  data_admissao: 'Data de Admissão',
  endereco_cep: 'CEP',
  banco_conta_numero: 'Conta Bancária',
  banco_tipo_conta: 'Tipo de Conta',
  observacoes: 'Observações'
};

// --- SCHEMA VALIDADO COM O BANCO DE DADOS ---
const funcionarioSchema = z.object({
  // Pessoal
  nome_completo: z.string().min(3, "Nome completo é obrigatório"),
  data_nascimento: z.string().min(10, "Data de nascimento inválida"), 
  cpf: z.string()
    .transform((val) => val.replace(/\D/g, ''))
    .refine((val) => val.length > 0, "CPF é obrigatório")
    .refine((val) => cpf.isValid(val), "CPF inválido"),
  
  rg: z.string().min(2, "RG é obrigatório"),
  
  genero: z.string().nullish().or(z.literal('')),
  estado_civil: z.string().nullish().or(z.literal('')),
  email_pessoal: z.string().email("E-mail inválido").or(z.literal("")).nullish(),
  telefone_celular: z.string().nullish().or(z.literal('')),

  // Endereço
  endereco_cep: z.string().min(8, "CEP inválido").or(z.literal('')),
  endereco_rua: z.string().nullish().or(z.literal('')),
  endereco_numero: z.string().nullish().or(z.literal('')),
  endereco_complemento: z.string().nullish().or(z.literal('')),
  endereco_bairro: z.string().nullish().or(z.literal('')),
  endereco_cidade: z.string().nullish().or(z.literal('')),
  endereco_estado: z.string().nullish().or(z.literal('')),

  // Contratual
  empresa_id: z.string().min(1, "Selecione a Empresa"),
  id_matricula: z.string().nullish().or(z.literal('')),
  pis: z.string().nullish().or(z.literal('')),
  
  cbo: z.string().min(1, "CBO é obrigatório"),
  
  cargo: z.string().min(1, "Cargo é obrigatório"),
  departamento: z.string().nullish().or(z.literal('')),
  email_corporativo: z.string().email("E-mail inválido").min(1, "E-mail corporativo é obrigatório"),
  data_admissao: z.string().min(10, "Data de admissão obrigatória"),
  tipo_contrato: z.string().optional(),
  
  // Salário Obrigatório
  salario_bruto: z.preprocess(
    (val) => {
      if (!val || String(val).trim() === '') return undefined;
      return parseFloat(String(val));
    },
    z.number({ required_error: "Salário é obrigatório", invalid_type_error: "Informe um valor válido" })
     .min(0.01, "Salário deve ser maior que zero")
  ),

  status: z.string().optional(),

  // Bancário - NOMES EXATOS DO BANCO
  banco_nome: z.string().nullish().or(z.literal('')),
  banco_agencia: z.string().nullish().or(z.literal('')),
  banco_conta_numero: z.string().nullish().or(z.literal('')),
  banco_tipo_conta: z.string().nullish().or(z.literal('')),

  // Campo Observações
  observacoes: z.string().nullish().or(z.literal('')),

  // Campos Virtuais
  inicio_periodo_migracao: z.string().optional(),
  saldo_inicial_migracao: z.string().optional(),
});

function FuncionarioForm() {
  const [activeTab, setActiveTab] = useState('pessoal');
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showWizardDocs, setShowWizardDocs] = useState(false);
  const [newFuncId, setNewFuncId] = useState(null);
  const [listaBancos, setListaBancos] = useState([]);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [modoMigracao, setModoMigracao] = useState(false);
  const [pageError, setPageError] = useState(null);

  const numeroInputRef = useRef(null);
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(id && id !== 'novo');
  const { mutate } = useSWRConfig();

  const {
    register,
    handleSubmit,
    formState: { errors },
    control,
    setValue,
    reset,
    setFocus
  } = useForm({
    resolver: zodResolver(funcionarioSchema),
    defaultValues: {
      status: 'Ativo',
      tipo_contrato: 'CLT',
      banco_tipo_conta: 'Corrente',
      pis: '',
      cbo: '',
      observacoes: ''
    }
  });

  const { data: funcionarioData, isLoading: isFetching } = useSWR(
    isEditMode ? ['funcionario', id] : null,
    () => getFuncionarioById(id)
  );

  const { data: listaEmpresas, isLoading: loadingEmpresas } = useSWR('getEmpresas', getEmpresas);

  useEffect(() => {
    getBancos().then(data => setListaBancos(data || []));
  }, []);

  useEffect(() => {
    if (funcionarioData) {
      const formattedData = {
        ...funcionarioData,
        data_nascimento: funcionarioData.data_nascimento ? funcionarioData.data_nascimento.split('T')[0] : '',
        data_admissao: funcionarioData.data_admissao ? funcionarioData.data_admissao.split('T')[0] : '',
        salario_bruto: funcionarioData.salario_bruto || '',
        pis: funcionarioData.pis || '',
        cbo: funcionarioData.cbo || '',
        empresa_id: funcionarioData.empresa_id || '',
        
        // Mapeamento Direto
        banco_conta_numero: funcionarioData.banco_conta_numero || '', 
        banco_tipo_conta: funcionarioData.banco_tipo_conta || 'Corrente',
        observacoes: funcionarioData.observacoes || '',
      };
      
      reset(formattedData);
      if (funcionarioData.avatar_url) setAvatarUrl(funcionarioData.avatar_url);
    }
  }, [funcionarioData, reset]);

  const onInvalid = (errors) => {
    const errorKeys = Object.keys(errors);
    
    if (errorKeys.length > 0) {
      const missingFields = errorKeys
        .map(key => friendlyNames[key] || key)
        .slice(0, 3);
      
      const more = errorKeys.length > 3 ? ` e mais ${errorKeys.length - 3}` : '';
      
      toast.error(`Verifique os campos: ${missingFields.join(', ')}${more}`, {
        duration: 5000,
        position: 'top-center',
        style: { border: '1px solid #ef4444', color: '#7f1d1d', background: '#fef2f2' }
      });

      if (errorKeys.some(k => ['nome_completo','cpf','rg','data_nascimento','endereco_cep'].includes(k))) {
        setActiveTab('pessoal');
      } else if (errorKeys.some(k => ['empresa_id','cbo','cargo','salario_bruto','email_corporativo'].includes(k))) {
        setActiveTab('contratual');
      } else if (errorKeys.some(k => k.includes('banco'))) {
        setActiveTab('bancario');
      }
      
      try { setFocus(errorKeys[0]); } catch (e) {}
    }
  };

  const onSubmit = async (data) => {
    if (isLoading) return;
    setIsLoading(true);
    setPageError(null);

    try {
      let payload = { ...data };
      payload.avatar_url = avatarUrl;
      
      // Limpeza de campos virtuais
      delete payload.inicio_periodo_migracao;
      delete payload.saldo_inicial_migracao;

      // Sanitização
      if (payload.pis) payload.pis = payload.pis.replace(/\D/g, '');
      if (payload.cbo) payload.cbo = payload.cbo.replace(/\D/g, '');
      if (payload.email_corporativo && !payload.email) payload.email = payload.email_corporativo;

      Object.keys(payload).forEach(key => {
        if (payload[key] === '') payload[key] = null;
      });

      if (isEditMode) {
        delete payload.salario_bruto; // Salário via histórico
        await updateFuncionario(id, payload);
        toast.success('Atualizado com sucesso!');
        navigate('/funcionarios');
      } else {
        const novoFunc = await createFuncionario(payload);
        const funcionarioId = novoFunc.id;
        
        // Lógica de Férias
        if (modoMigracao) {
          if (data.inicio_periodo_migracao && data.saldo_inicial_migracao) {
            const inicio = new Date(data.inicio_periodo_migracao);
            const fim = new Date(inicio);
            fim.setFullYear(fim.getFullYear() + 1);
            await supabase.from('periodos_aquisitivos').insert([{
              funcionario_id: funcionarioId, inicio_periodo: data.inicio_periodo_migracao,
              fim_periodo: fim.toISOString().split('T')[0], dias_direito: 30,
              dias_gozados: 30 - Number(data.saldo_inicial_migracao), status: 'Aberto'
            }]);
          }
        } else {
          if (data.data_admissao) {
            const admissao = new Date(data.data_admissao);
            const fimAquisitivo = new Date(admissao);
            fimAquisitivo.setFullYear(fimAquisitivo.getFullYear() + 1);
            await supabase.from('periodos_aquisitivos').insert([{
              funcionario_id: funcionarioId, inicio_periodo: data.data_admissao,
              fim_periodo: fimAquisitivo.toISOString().split('T')[0], dias_direito: 30,
              dias_gozados: 0, status: 'Em Aquisicao'
            }]);
          }
        }

        toast.success('Cadastrado com sucesso!');
        setNewFuncId(funcionarioId);
        setShowWizardDocs(true);
      }
      mutate('getFuncionarios');
    } catch (err) {
      console.error("Erro no submit:", err);
      let errorMessage = "Erro ao salvar.";
      
      if (err.message?.includes('column') && err.message?.includes('does not exist')) {
         errorMessage = `Erro de Schema: Coluna inexistente (${err.message}).`;
      } else if (err.message?.includes('funcionarios_cpf_key')) {
         errorMessage = "CPF já cadastrado.";
      } else if (err.message) {
         errorMessage = err.message;
      }
      
      setPageError(errorMessage);
      toast.error("Não foi possível salvar.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinishWizard = () => { setShowWizardDocs(false); navigate('/funcionarios'); };
  
  const handleCepBlur = async (e) => {
    const cep = e.target.value.replace(/\D/g, '');
    if (cep.length !== 8) return;
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();
      if (!data.erro) {
        setValue('endereco_rua', data.logradouro);
        setValue('endereco_bairro', data.bairro);
        setValue('endereco_cidade', data.localidade);
        setValue('endereco_estado', data.uf);
        if (numeroInputRef.current) numeroInputRef.current.focus();
      }
    } catch (error) { }
  };

  const handleDeleteClick = () => setIsModalOpen(true);
  
  const handleConfirmDelete = async () => {
    if (!isEditMode) return;
    setIsLoading(true);
    try {
      await deleteFuncionario(id);
      mutate('getFuncionarios');
      toast.success('Excluído com sucesso!');
      navigate('/funcionarios');
    } catch (err) {
      toast.error("Erro ao excluir.");
      setIsLoading(false);
      setIsModalOpen(false);
    }
  };

  const mergeRefs = (...refs) => (value) => {
    refs.forEach((ref) => {
      if (typeof ref === "function") ref(value);
      else if (ref != null) ref.current = value;
    });
  };

  const getInputClass = (fieldName) => `form-control ${errors[fieldName] ? 'input-error' : ''}`;

  if (isFetching && isEditMode) return <div className="loading-state">Carregando dados...</div>;

  return (
    <div className="form-container fade-in">
      <form onSubmit={handleSubmit(onSubmit, onInvalid)}>
        <div className="form-header">
          <h2>{isEditMode ? 'Editar Colaborador' : 'Novo Colaborador'}</h2>
          <div className="form-actions space-between">
            {isEditMode && (
              <button type="button" className="btn btn-danger" onClick={handleDeleteClick}>
                <span className="material-symbols-outlined">delete</span> Excluir Funcionário
              </button>
            )}
            <div style={{ display: 'flex', gap: '1rem', marginLeft: 'auto' }}>
              <button type="button" className="btn btn-secondary" onClick={() => navigate('/funcionarios')}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={isLoading}>{isLoading ? 'Salvando...' : 'Salvar'}</button>
            </div>
          </div>
        </div>

        <div className="avatar-section-wrapper">
          <AvatarUpload url={avatarUrl} onUpload={setAvatarUrl} />
        </div>

        <div className="form-tabs">
          <button type="button" onClick={() => setActiveTab('pessoal')} className={`tab-btn ${activeTab === 'pessoal' ? 'active' : ''} ${Object.keys(errors).some(k => ['nome_completo','cpf','rg'].includes(k)) ? 'tab-error' : ''}`}>
            Dados Pessoais
            {Object.keys(errors).some(k => ['nome_completo','cpf','rg'].includes(k)) && <span className="error-dot">•</span>}
          </button>
          <button type="button" onClick={() => setActiveTab('contratual')} className={`tab-btn ${activeTab === 'contratual' ? 'active' : ''} ${Object.keys(errors).some(k => ['salario_bruto','cargo','empresa_id'].includes(k)) ? 'tab-error' : ''}`}>
            Dados Contratuais
            {Object.keys(errors).some(k => ['salario_bruto','cargo','empresa_id'].includes(k)) && <span className="error-dot">•</span>}
          </button>
          <button type="button" onClick={() => setActiveTab('bancario')} className={`tab-btn ${activeTab === 'bancario' ? 'active' : ''}`}>Dados Bancários</button>
          {isEditMode && <button type="button" onClick={() => setActiveTab('historico')} className="tab-btn">Histórico</button>}
        </div>

        <div className="form-content">
          {/* ABA PESSOAL */}
          {activeTab === 'pessoal' && (
            <div className="form-grid">
              <div className="form-group span-3">
                <label>Nome Completo *</label>
                <input type="text" {...register("nome_completo")} className={getInputClass('nome_completo')} />
                {errors.nome_completo && <span className="error-text">{errors.nome_completo.message}</span>}
              </div>
              <div className="form-group">
                <label>Data de Nascimento *</label>
                <input type="date" {...register("data_nascimento")} className={getInputClass('data_nascimento')} />
                {errors.data_nascimento && <span className="error-text">{errors.data_nascimento.message}</span>}
              </div>
              <div className="form-group span-2">
                <label>Email Pessoal</label>
                <input type="email" {...register("email_pessoal")} className={getInputClass('email_pessoal')} />
                {errors.email_pessoal && <span className="error-text">{errors.email_pessoal.message}</span>}
              </div>
              <div className="form-group span-2">
                <label>Telefone Celular</label>
                <Controller name="telefone_celular" control={control} render={({ field }) => (
                    <IMaskInput mask="(00) 00000-0000" name={field.name} value={field.value || ''} onAccept={(value) => field.onChange(value)} className={getInputClass('telefone_celular')} />
                  )}
                />
              </div>
              <div className="form-group">
                <label>CPF *</label>
                <Controller name="cpf" control={control} render={({ field: { onChange, value, ref, ...fieldRest } }) => (
                    <IMaskInput {...fieldRest} mask="000.000.000-00" value={value || ''} inputRef={ref} onAccept={(val) => onChange(val)} className={getInputClass('cpf')} />
                  )}
                />
                {errors.cpf && <span className="error-text">{errors.cpf.message}</span>}
              </div>
              <div className="form-group">
                <label>RG *</label>
                <input type="text" {...register("rg")} className={getInputClass('rg')} />
                {errors.rg && <span className="error-text">{errors.rg.message}</span>}
              </div>
              <div className="form-group"><label>Gênero</label><select {...register("genero")} className="form-control"><option value="">Selecione</option><option value="Masculino">Masculino</option><option value="Feminino">Feminino</option></select></div>
              <div className="form-group"><label>Estado Civil</label><select {...register("estado_civil")} className="form-control"><option value="">Selecione</option><option value="Solteiro">Solteiro</option><option value="Casado">Casado</option></select></div>
              <div className="form-group span-4"><hr /><h4>Endereço Residencial</h4></div>
              <div className="form-group"><label>CEP</label><Controller name="endereco_cep" control={control} render={({ field: { onChange, value, ref, ...fieldRest } }) => (<IMaskInput {...fieldRest} mask="00000-000" value={value || ''} inputRef={ref} onAccept={(val) => onChange(val)} onBlur={handleCepBlur} className={getInputClass('endereco_cep')} />)} /> {errors.endereco_cep && <span className="error-text">{errors.endereco_cep.message}</span>}</div>
              <div className="form-group span-3"><label>Rua</label><input type="text" {...register("endereco_rua")} className="form-control" /></div>
              <div className="form-group"><label>Número</label><input type="text" {...register("endereco_numero")} ref={mergeRefs(register("endereco_numero").ref, numeroInputRef)} className="form-control" /></div>
              <div className="form-group"><label>Bairro</label><input type="text" {...register("endereco_bairro")} className="form-control" /></div>
              <div className="form-group"><label>Cidade</label><input type="text" {...register("endereco_cidade")} className="form-control" /></div>
              <div className="form-group"><label>UF</label><input type="text" {...register("endereco_estado")} maxLength="2" className="form-control uppercase-input" /></div>
              <div className="form-group span-4"><label>Complemento</label><input type="text" {...register("endereco_complemento")} className="form-control" /></div>
            </div>
          )}

          {/* ABA CONTRATUAL */}
          {activeTab === 'contratual' && (
            <div className="form-grid">
              <div className="form-group span-2">
                <label>Empresa *</label>
                <select {...register("empresa_id")} disabled={loadingEmpresas} className={getInputClass('empresa_id')}>
                  <option value="">Selecione...</option>
                  {listaEmpresas?.map(emp => (<option key={emp.id} value={emp.id}>{emp.nome_fantasia}</option>))}
                </select>
                {errors.empresa_id && <span className="error-text">{errors.empresa_id.message}</span>}
              </div>
              <div className="form-group"><label>PIS</label><Controller name="pis" control={control} render={({ field }) => (<IMaskInput mask="000.00000.00-0" value={field.value || ''} onAccept={(value) => field.onChange(value)} className="form-control" />)} /></div>
              <div className="form-group"><label>CBO *</label><input type="text" {...register("cbo")} className={getInputClass('cbo')} />{errors.cbo && <span className="error-text">{errors.cbo.message}</span>}</div>
              <div className="form-group"><label>Matrícula</label><input type="text" {...register("id_matricula")} className="form-control" /></div>
              <div className="form-group span-2"><label>Email Corporativo *</label><input type="email" {...register("email_corporativo")} className={getInputClass('email_corporativo')} />{errors.email_corporativo && <span className="error-text">{errors.email_corporativo.message}</span>}</div>
              <div className="form-group"><label>Cargo *</label><input type="text" {...register("cargo")} className={getInputClass('cargo')} />{errors.cargo && <span className="error-text">{errors.cargo.message}</span>}</div>
              <div className="form-group"><label>Departamento</label><input type="text" {...register("departamento")} className="form-control" /></div>
              <div className="form-group"><label>Admissão *</label><input type="date" {...register("data_admissao")} className={getInputClass('data_admissao')} />{errors.data_admissao && <span className="error-text">{errors.data_admissao.message}</span>}</div>
              <div className="form-group"><label>Contrato</label><select {...register("tipo_contrato")} className="form-control"><option value="CLT">CLT</option><option value="PJ">PJ</option><option value="Estagio">Estágio</option></select></div>
              <div className="form-group">
                <label>Salário *</label>
                <div style={{ display: 'flex', gap: '5px' }}>
                  <input type="number" step="0.01" {...register("salario_bruto")} disabled={isEditMode} className={isEditMode ? "input-locked" : getInputClass('salario_bruto')} />
                  {isEditMode && <button type="button" className="btn-icon-action" onClick={() => navigate('/salarios')}><span className="material-symbols-outlined">payments</span></button>}
                </div>
                {errors.salario_bruto && <span className="error-text">{errors.salario_bruto.message}</span>}
              </div>
              <div className="form-group"><label>Status</label><select {...register("status")} className="form-control"><option value="Ativo">Ativo</option><option value="Inativo">Inativo</option></select></div>
              
              {/* CAMPO OBSERVAÇÕES */}
              <div className="form-group span-4">
                <label>Observações</label>
                <textarea {...register("observacoes")} className="form-control" rows="3" placeholder="Anotações internas..."></textarea>
              </div>

              {!isEditMode && (
                <div className="form-group span-4 ferias-setup-box">
                  <div className="switch-wrapper">
                    <label className="switch-label"><input type="checkbox" checked={modoMigracao} onChange={(e) => setModoMigracao(e.target.checked)} /><span className="slider"></span><span className="label-text">Modo Migração</span></label>
                  </div>
                  {modoMigracao && (<div className="migracao-inputs"><div className="form-group"><label>Início Período</label><input type="date" {...register('inicio_periodo_migracao')} className="form-control" /></div><div className="form-group"><label>Saldo Dias</label><input type="number" {...register('saldo_inicial_migracao')} className="form-control" /></div></div>)}
                </div>
              )}
            </div>
          )}

          {/* ABA BANCÁRIO */}
          {activeTab === 'bancario' && (
            <div className="form-grid">
              <div className="form-group">
                <label>Banco</label>
                <select {...register("banco_nome")} className="form-control"><option value="">Selecione...</option>{listaBancos.map(b => (<option key={b.code} value={`${b.code} - ${b.name}`}>{b.code} - {b.name}</option>))}</select>
              </div>
              <div className="form-group"><label>Agência</label><input type="text" {...register("banco_agencia")} className="form-control" /></div>
              <div className="form-group"><label>Conta</label><input type="text" {...register("banco_conta_numero")} className="form-control" /></div>
              <div className="form-group">
                <label>Tipo</label>
                <select {...register("banco_tipo_conta")} className="form-control">
                  <option value="Corrente">Corrente</option><option value="Poupanca">Poupança</option><option value="Salario">Salário</option>
                </select>
              </div>
            </div>
          )}

          {isEditMode && activeTab === 'historico' && (
            <div className="historico-container">
              <h3>Histórico</h3>
              <HistoricoMovimentacoes funcionarioId={id} />
              <div className="divider-full"></div>
              <TimelineAuditoria registroId={id} />
            </div>
          )}
        </div>
        
        {pageError && <div className="error-message-box" style={{color:'red', marginTop:'10px', fontWeight:'bold'}}>{pageError}</div>}
      </form>

      <ModalConfirmacao isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onConfirm={handleConfirmDelete} title="Confirmar Exclusão">
        <p>Ação irreversível.</p>
      </ModalConfirmacao>

      {showWizardDocs && (
        <div className="modal-overlay" style={{ background: 'rgba(0,0,0,0.8)' }}>
           <div className="modal-content" style={{ maxWidth: '600px', padding: '30px' }}>
              <h2 style={{ color: '#064e3b' }}>Sucesso!</h2>
              <div style={{ background: '#f0fdf4', padding: '15px', borderRadius: '8px', margin: '20px 0' }}>
                <p>Upload de documentos agora?</p>
                {newFuncId && <DocumentoUploadForm funcionarioId={newFuncId} />}
              </div>
              <button className="button-primary" onClick={handleFinishWizard}>Concluir</button>
           </div>
        </div>
      )}
    </div>
  );
}

export default FuncionarioForm;