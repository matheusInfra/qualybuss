import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import useSWR from 'swr';
import { toast } from 'react-hot-toast';
import { supabase } from '../services/supabaseClient'; 
import { 
  createFuncionario, 
  updateFuncionario, 
  getFuncionarioById 
} from '../services/funcionarioService';
import { getEmpresas } from '../services/empresaService';
import { getBancos } from '../services/bancoService';
import { buscarCep } from '../utils/formUtils'; 
import './FuncionarioForm.css';

function FuncionarioForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // Verifica se é edição (tem ID e não é a palavra 'novo')
  const isEditMode = id && id !== 'novo'; 
  
  const { register, handleSubmit, setValue, watch, reset, setFocus, formState: { errors } } = useForm();
  
  const [loading, setLoading] = useState(false);
  const [modoMigracao, setModoMigracao] = useState(false);
  const [listaBancos, setListaBancos] = useState([]);

  const { data: empresas } = useSWR('getEmpresas', getEmpresas);
  
  // Monitora campos para lógica visual
  const dataAdmissao = watch('data_admissao');
  
  // [CORREÇÃO] Monitora o campo com o nome correto do banco
  const cep = watch('endereco_cep');

  // 1. Carrega lista de bancos
  useEffect(() => {
    getBancos().then(data => setListaBancos(data));
  }, []);

  // 2. Carrega dados do funcionário (se for Edição)
  useEffect(() => {
    if (isEditMode) {
      setLoading(true);
      getFuncionarioById(id)
        .then(func => {
          if (func) {
            // O reset preenche automaticamente se os nomes dos inputs baterem com as chaves do objeto 'func'
            reset(func);
            
            // Formatação de datas para inputs HTML
            if(func.data_nascimento) setValue('data_nascimento', func.data_nascimento.split('T')[0]);
            if(func.data_admissao) setValue('data_admissao', func.data_admissao.split('T')[0]);
          }
        })
        .catch(err => toast.error("Erro ao carregar dados."))
        .finally(() => setLoading(false));
    }
  }, [id, isEditMode, reset, setValue]);

  // 3. Busca CEP automático (Adaptado para os nomes do seu banco)
  useEffect(() => {
    if (cep && cep.length >= 8) {
      buscarCep(cep).then(data => {
        if (!data.erro) {
          setValue('endereco_rua', data.logradouro);     // Mapeado para endereco_rua
          setValue('endereco_bairro', data.bairro);      // Mapeado para endereco_bairro
          setValue('endereco_cidade', data.localidade);  // Mapeado para endereco_cidade
          setValue('endereco_estado', data.uf);          // Mapeado para endereco_estado
          setFocus('endereco_numero');
        }
      });
    }
  }, [cep, setValue, setFocus]);

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      let funcionarioId = id;
      
      // [IMPORTANTE] Garantir sincronia do email para RLS
      // Copia o email corporativo para o campo 'email' de sistema se estiver vazio
      if (data.email_corporativo && !data.email) {
          data.email = data.email_corporativo;
      }

      if (isEditMode) {
        await updateFuncionario(id, data);
        toast.success('Dados atualizados com sucesso!');
      } else {
        const novoFunc = await createFuncionario(data);
        funcionarioId = novoFunc.id;
        toast.success('Colaborador cadastrado!');

        // Lógica de Férias (Apenas na criação)
        if (modoMigracao) {
          if (data.inicio_periodo_migracao && data.saldo_inicial_migracao) {
             const inicio = new Date(data.inicio_periodo_migracao);
             const fim = new Date(inicio);
             fim.setFullYear(fim.getFullYear() + 1);
             
             await supabase.from('periodos_aquisitivos').insert([{
               funcionario_id: funcionarioId,
               inicio_periodo: data.inicio_periodo_migracao,
               fim_periodo: fim.toISOString().split('T')[0],
               dias_direito: 30,
               dias_gozados: 30 - Number(data.saldo_inicial_migracao),
               status: 'Aberto'
             }]);
          }
        } else {
          const admissao = new Date(data.data_admissao);
          const fimAquisitivo = new Date(admissao);
          fimAquisitivo.setFullYear(fimAquisitivo.getFullYear() + 1);

          await supabase.from('periodos_aquisitivos').insert([{
            funcionario_id: funcionarioId,
            inicio_periodo: data.data_admissao,
            fim_periodo: fimAquisitivo.toISOString().split('T')[0],
            dias_direito: 30,
            dias_gozados: 0,
            status: 'Em Aquisicao'
          }]);
        }
      }
      navigate('/funcionarios');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao salvar: ' + (error.message || 'Verifique os campos.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="funcionario-page-container">
      <div className="form-container">
        
        <div className="form-header">
          <h2>{isEditMode ? 'Editar Colaborador' : 'Novo Colaborador'}</h2>
          <button type="button" className="btn-close" onClick={() => navigate('/funcionarios')}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          
          {/* SETOR 1: DADOS PESSOAIS */}
          <div className="form-section">
            <h3 className="section-title">
              <span className="material-symbols-outlined">person</span> Dados Pessoais
            </h3>
            <div className="form-grid">
              <div className="form-group span-2">
                <label>Nome Completo *</label>
                <input {...register('nome_completo', { required: true })} placeholder="Nome Civil Completo" />
              </div>
              <div className="form-group">
                <label>CPF *</label>
                <input {...register('cpf', { required: true })} placeholder="000.000.000-00" />
              </div>
              <div className="form-group">
                <label>RG</label>
                <input {...register('rg')} />
              </div>
              <div className="form-group">
                <label>Data Nascimento</label>
                <input type="date" {...register('data_nascimento')} />
              </div>
              <div className="form-group">
                <label>Gênero</label>
                <select {...register('genero')}>
                  <option value="">Selecione...</option>
                  <option value="Masculino">Masculino</option>
                  <option value="Feminino">Feminino</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>
              <div className="form-group">
                <label>Estado Civil</label>
                <select {...register('estado_civil')}>
                  <option value="Solteiro(a)">Solteiro(a)</option>
                  <option value="Casado(a)">Casado(a)</option>
                  <option value="Divorciado(a)">Divorciado(a)</option>
                </select>
              </div>
              <div className="form-group">
                <label>Celular / WhatsApp</label>
                {/* [CORREÇÃO] Nome da coluna no banco: telefone_celular */}
                <input {...register('telefone_celular')} placeholder="(11) 99999-9999" />
              </div>
              <div className="form-group">
                <label>Email Pessoal</label>
                <input type="email" {...register('email_pessoal')} />
              </div>
            </div>
            
            {/* Endereço Integrado */}
            <h4 className="sub-section-title" style={{marginTop:'20px', marginBottom:'10px', color:'#64748b'}}>Endereço</h4>
            <div className="form-grid">
              <div className="form-group">
                <label>CEP</label>
                {/* [CORREÇÃO] endereco_cep */}
                <input {...register('endereco_cep')} placeholder="00000-000" maxLength={9} />
              </div>
              <div className="form-group span-2">
                <label>Logradouro</label>
                {/* [CORREÇÃO] endereco_rua */}
                <input {...register('endereco_rua')} />
              </div>
              <div className="form-group">
                <label>Número</label>
                {/* [CORREÇÃO] endereco_numero */}
                <input {...register('endereco_numero')} />
              </div>
              <div className="form-group">
                <label>Bairro</label>
                {/* [CORREÇÃO] endereco_bairro */}
                <input {...register('endereco_bairro')} />
              </div>
              <div className="form-group">
                <label>Cidade</label>
                {/* [CORREÇÃO] endereco_cidade */}
                <input {...register('endereco_cidade')} />
              </div>
              <div className="form-group">
                <label>UF</label>
                {/* [CORREÇÃO] endereco_estado */}
                <input {...register('endereco_estado')} maxLength={2} style={{textTransform: 'uppercase'}} />
              </div>
            </div>
          </div>

          {/* SETOR 2: DADOS PROFISSIONAIS */}
          <div className="form-section">
            <h3 className="section-title">
              <span className="material-symbols-outlined">badge</span> Dados Profissionais
            </h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Empresa *</label>
                <select {...register('empresa_id', { required: true })}>
                  <option value="">Selecione...</option>
                  {empresas?.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.nome_fantasia || emp.razao_social}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Cargo *</label>
                <input {...register('cargo', { required: true })} />
              </div>
              <div className="form-group">
                <label>Departamento</label>
                <input {...register('departamento')} />
              </div>
              <div className="form-group">
                <label>Matrícula</label>
                {/* [CORREÇÃO] id_matricula */}
                <input {...register('id_matricula')} />
              </div>
              <div className="form-group">
                <label>Data Admissão *</label>
                <input type="date" {...register('data_admissao', { required: true })} />
              </div>
              <div className="form-group">
                <label>Tipo Contrato</label>
                <select {...register('tipo_contrato')}>
                  <option value="CLT">CLT</option>
                  <option value="PJ">PJ</option>
                  <option value="Estágio">Estágio</option>
                </select>
              </div>
              <div className="form-group">
                <label>Salário Bruto (R$)</label>
                <input type="number" step="0.01" {...register('salario_bruto')} />
              </div>
              <div className="form-group">
                <label>Status</label>
                <select {...register('status')}>
                  <option value="Ativo">Ativo</option>
                  <option value="Férias">Férias</option>
                  <option value="Afastado">Afastado</option>
                  <option value="Inativo">Inativo</option>
                </select>
              </div>
              <div className="form-group">
                 <label>Email Corporativo (Login)</label>
                 {/* [CORREÇÃO] email_corporativo */}
                 <input type="email" {...register('email_corporativo')} placeholder="email@empresa.com" />
              </div>
            </div>
          </div>

          {/* SETOR 3: DADOS BANCÁRIOS */}
          <div className="form-section">
            <h3 className="section-title">
              <span className="material-symbols-outlined">account_balance</span> Dados Bancários
            </h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Banco</label>
                {/* [CORREÇÃO] banco_nome */}
                <select {...register('banco_nome')}>
                  <option value="">Selecione...</option>
                  {listaBancos.map(banco => (
                    <option key={banco.code} value={`${banco.code} - ${banco.name}`}>
                      {banco.code} - {banco.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Tipo Conta</label>
                {/* [CORREÇÃO] banco_tipo_conta */}
                <select {...register('banco_tipo_conta')}>
                  <option value="Corrente">Corrente</option>
                  <option value="Poupança">Poupança</option>
                  <option value="Salário">Salário</option>
                </select>
              </div>
              <div className="form-group">
                <label>Agência</label>
                {/* [CORREÇÃO] banco_agencia */}
                <input {...register('banco_agencia')} />
              </div>
              <div className="form-group">
                <label>Conta</label>
                {/* [CORREÇÃO] banco_conta_numero */}
                <input {...register('banco_conta_numero')} />
              </div>
              <div className="form-group span-2">
                <label>Chave PIX</label>
                <input {...register('chave_pix')} />
              </div>
            </div>
          </div>

          {/* SETOR 4: HISTÓRICO E CONFIGURAÇÃO (FÉRIAS) */}
          <div className="form-section destaque-section">
            <h3 className="section-title">
              <span className="material-symbols-outlined">history_edu</span> Configuração de Férias
            </h3>
            
            <div className="form-grid">
               <div className="form-group span-3">
                 <label>Observações Gerais</label>
                 <textarea {...register('observacoes')} rows="2" placeholder="Anotações internas..."></textarea>
               </div>
            </div>

            {/* APENAS NA CRIAÇÃO: Pergunta sobre Férias */}
            {!isEditMode && (
              <div className="ferias-setup-box">
                <div className="switch-wrapper">
                  <label className="switch-label">
                    <input 
                      type="checkbox" 
                      checked={modoMigracao} 
                      onChange={(e) => setModoMigracao(e.target.checked)} 
                    />
                    <span className="slider"></span>
                    <span className="label-text">
                      {modoMigracao ? "Modo Migração (Colaborador Antigo)" : "Novo Colaborador (Início Imediato)"}
                    </span>
                  </label>
                </div>

                {!modoMigracao ? (
                  <p className="info-text">
                    <span className="material-symbols-outlined icon-small">lock_clock</span>
                    <strong> Novo Colaborador:</strong> O sistema criará o período aquisitivo iniciando na data de admissão.
                    O saldo ficará <strong>bloqueado (Em Aquisição)</strong> até completar 1 ano.
                  </p>
                ) : (
                  <div className="migracao-inputs">
                    <div className="form-group">
                      <label>Início do Período VIGENTE</label>
                      <input type="date" {...register('inicio_periodo_migracao')} />
                      <small style={{color:'#64748b'}}>Último aniversário de admissão.</small>
                    </div>
                    <div className="form-group">
                      <label>Saldo Disponível (Dias)</label>
                      <input type="number" {...register('saldo_inicial_migracao')} placeholder="Ex: 30" />
                      <small style={{color:'#64748b'}}>Dias que ele pode tirar HOJE.</small>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* BOTÕES DE AÇÃO */}
          <div className="form-actions">
            <button type="button" className="btn-cancel" onClick={() => navigate('/funcionarios')}>
              Cancelar
            </button>
            <button type="submit" className="btn-save" disabled={loading}>
              {loading ? 'Salvando...' : (isEditMode ? 'Salvar Alterações' : 'Cadastrar')}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

export default FuncionarioForm;