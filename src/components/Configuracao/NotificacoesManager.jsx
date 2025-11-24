import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { getSystemConfig, updateSystemConfig } from '../../services/configService';
import './Configuracao.css';

function NotificacoesManager() {
  const { register, handleSubmit, setValue, watch } = useForm();
  const [loading, setLoading] = useState(true);

  // Carregar dados ao montar
  useEffect(() => {
    const loadData = async () => {
      try {
        const config = await getSystemConfig('notificacoes');
        if (config) {
          setValue('email', config.email);
          setValue('sistema', config.sistema);
          setValue('slack', config.slack);
          setValue('frequencia', config.frequencia);
        }
      } catch (error) {
        toast.error('Erro ao carregar configurações.');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [setValue]);

  const onSubmit = async (data) => {
    const toastId = toast.loading('Salvando preferências...');
    try {
      await updateSystemConfig('notificacoes', data);
      toast.success('Preferências salvas com sucesso!', { id: toastId });
    } catch (error) {
      toast.error('Erro ao salvar.', { id: toastId });
    }
  };

  const handleReset = () => {
    setValue('email', true);
    setValue('sistema', true);
    setValue('slack', false);
    setValue('frequencia', 'Diariamente');
    toast('Padrões restaurados. Clique em Salvar para confirmar.', { icon: 'ℹ️' });
  };

  if (loading) return <div style={{padding:24}}>Carregando preferências...</div>;

  return (
    <div className="config-detail-view" style={{maxWidth:'900px', margin:'0 auto', background:'transparent'}}>
      <div className="detail-header">
        <div className="detail-title">
          <h2>Notificações</h2>
          <p className="detail-subtitle">Gerencie as preferências de alerta do sistema.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="detail-card" style={{padding: '0', overflow: 'hidden'}}>
          <div style={{padding: '24px', borderBottom: '1px solid #f3f4f6'}}>
            <h3 style={{border: 'none', margin: 0}}>Canais de Envio</h3>
          </div>

          <div style={{display: 'flex', flexDirection: 'column'}}>
            {/* Email */}
            <div className="notification-row">
              <div style={{display: 'flex', gap: '16px', alignItems: 'center'}}>
                <div className="icon-box"><span className="material-symbols-outlined">mail</span></div>
                <div>
                  <div className="row-title">E-mail</div>
                  <div className="row-subtitle">Enviar alertas para o e-mail cadastrado.</div>
                </div>
              </div>
              <label className="toggle-switch">
                <input type="checkbox" {...register('email')} />
                <span className="slider"></span>
              </label>
            </div>

            {/* Sistema */}
            <div className="notification-row">
              <div style={{display: 'flex', gap: '16px', alignItems: 'center'}}>
                <div className="icon-box"><span className="material-symbols-outlined">notifications_active</span></div>
                <div>
                  <div className="row-title">Sistema (Push)</div>
                  <div className="row-subtitle">Mostrar alertas no sino de notificações.</div>
                </div>
              </div>
              <label className="toggle-switch">
                <input type="checkbox" {...register('sistema')} />
                <span className="slider"></span>
              </label>
            </div>

            {/* Slack */}
            <div className="notification-row">
              <div style={{display: 'flex', gap: '16px', alignItems: 'center'}}>
                <div className="icon-box"><span className="material-symbols-outlined">chat</span></div>
                <div>
                  <div className="row-title">Slack</div>
                  <div className="row-subtitle">Integração via Webhook (Requer configuração).</div>
                </div>
              </div>
              <label className="toggle-switch">
                <input type="checkbox" {...register('slack')} />
                <span className="slider"></span>
              </label>
            </div>
          </div>
        </div>

        <div className="detail-card">
          <h3>Frequência de Resumos</h3>
          <div style={{maxWidth: '300px'}}>
            <label style={{display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 500}}>Enviar relatório por e-mail</label>
            <select className="erp-select" {...register('frequencia')}>
              <option>Nunca</option>
              <option>Diariamente</option>
              <option>Semanalmente</option>
              <option>Mensalmente</option>
            </select>
          </div>
        </div>

        <div className="erp-actions" style={{background: 'transparent', borderTop: 'none', padding: 0}}>
          <button type="button" onClick={handleReset} className="btn-secondary">Restaurar Padrão</button>
          <button type="submit" className="btn-primary">Salvar Alterações</button>
        </div>
      </form>
    </div>
  );
}

export default NotificacoesManager;