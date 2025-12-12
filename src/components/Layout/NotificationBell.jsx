import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';
import './NotificationBell.css';

export default function NotificationBell() {
    const [isOpen, setIsOpen] = useState(false);
    const [notificacoes, setNotificacoes] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const bellRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        fetchNotifications();

        // Fecha ao clicar fora
        const handleClickOutside = (event) => {
            if (bellRef.current && !bellRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchNotifications = async () => {
        try {
            const msgs = [];
            const hoje = new Date();

            // ==============================================================================
            // 1. DATA DRIVEN ALERTS (Active Database Triggers)
            // ==============================================================================

            // A. Solicitações Pendentes (Ausências / Férias)
            const { data: pendencias } = await supabase
                .from('solicitacoes_ausencia')
                .select('id, tipo, funcionario_id, funcionarios(nome_completo)')
                .eq('status', 'Pendente');

            if (pendencias && pendencias.length > 0) {
                pendencias.forEach(p => {
                    msgs.push({
                        tipo: 'alert',
                        titulo: `Aprovação Pendente: ${p.tipo}`,
                        texto: `${p.funcionarios?.nome_completo} solicitou ${p.tipo}.`,
                        link: '/ausencias' // Redireciona para o módulo de aprovação
                    });
                });
            }

            // B. Auditoria (Últimas 24h) - Alterações Cadastrais
            const ontem = new Date();
            ontem.setDate(ontem.getDate() - 1);

            const { data: logs } = await supabase
                .from('logs_auditoria')
                .select('*')
                .gte('data_alteracao', ontem.toISOString())
                .neq('usuario_responsavel', 'sistema') // Ignora logs automáticos se quiser
                .order('data_alteracao', { ascending: false })
                .limit(5);

            if (logs && logs.length > 0) {
                logs.forEach(log => {
                    // Evita mostrar minhas próprias ações (Opcional, mas melhora UX)
                    // if (log.usuario_responsavel === currentUserEmail) return;

                    let acaoTexto = '';
                    if (log.tipo_acao === 'INSERT') acaoTexto = 'Novo registro criado';
                    if (log.tipo_acao === 'UPDATE') acaoTexto = 'Registro atualizado';
                    if (log.tipo_acao === 'DELETE') acaoTexto = 'Registro excluído';

                    msgs.push({
                        tipo: 'info',
                        titulo: `Auditoria: ${log.tabela_afetada}`,
                        texto: `${acaoTexto} por ${log.usuario_responsavel?.split('@')[0]}`,
                        link: '/funcionarios' // Ou um link específico se possível
                    });
                });
            }

            // ==============================================================================
            // 2. PASSIVE ALERTS (Calculated Locally)
            // ==============================================================================

            // C. Aniversariantes do Mês
            const { data: aniversariantes } = await supabase
                .from('funcionarios')
                .select('nome_completo, data_nascimento')
                .eq('status', 'Ativo');

            if (aniversariantes) {
                const niverHoje = aniversariantes.filter(f => {
                    if (!f.data_nascimento) return false;
                    const d = new Date(f.data_nascimento);
                    return d.getDate() === hoje.getDate() && d.getMonth() === hoje.getMonth();
                });

                niverHoje.forEach(f => {
                    msgs.push({
                        tipo: 'niver',
                        titulo: 'Feliz Aniversário! 🎂',
                        texto: `${f.nome_completo} completa ano hoje.`,
                        link: '/dashboard'
                    });
                });
            }

            // D. Férias a Vencer (Lógica Simplificada)
            const { data: feriasCheck } = await supabase
                .from('funcionarios')
                .select('id, nome_completo, data_admissao')
                .eq('status', 'Ativo');

            if (feriasCheck) {
                feriasCheck.forEach(f => {
                    if (!f.data_admissao) return;
                    const admissao = new Date(f.data_admissao);
                    if (admissao.getMonth() === hoje.getMonth() && admissao.getDate() === hoje.getDate()) {
                        msgs.push({
                            tipo: 'ferias',
                            titulo: 'Aniversário de Empresa 🏆',
                            texto: `${f.nome_completo} completa mais um ano de casa hoje!`,
                            link: `/funcionarios/editar/${f.id}`
                        });
                    }
                });
            }

            setNotificacoes(msgs);
            setUnreadCount(msgs.length);

        } catch (err) {
            console.error("Erro ao carregar notificações", err);
        }
    };

    const handleOpen = () => {
        setIsOpen(!isOpen);
        // Ao abrir, zera contagem (simulação de leitura)
        if (!isOpen) setUnreadCount(0);
    };

    const handleClickItem = (link) => {
        setIsOpen(false);
        navigate(link);
    };

    return (
        <div className="notification-wrapper" ref={bellRef}>
            <button className="btn-bell" onClick={handleOpen}>
                <span className="material-symbols-outlined">notifications</span>
                {unreadCount > 0 && <span className="badge-count">{unreadCount}</span>}
            </button>

            {isOpen && (
                <div className="notification-dropdown fade-in">
                    <div className="dropdown-header">
                        <h4>Notificações</h4>
                        <span className="clear-btn" onClick={() => setNotificacoes([])}>Limpar</span>
                    </div>

                    <div className="dropdown-body">
                        {notificacoes.length === 0 ? (
                            <div className="empty-state">
                                <span className="material-symbols-outlined">check_circle</span>
                                <p>Tudo tranquilo por aqui.</p>
                            </div>
                        ) : (
                            notificacoes.map((notif, idx) => (
                                <div key={idx} className={`notif-item ${notif.tipo}`} onClick={() => handleClickItem(notif.link)}>
                                    <div className="notif-icon">
                                        {notif.tipo === 'niver' ? '🎂' : '⚠️'}
                                    </div>
                                    <div className="notif-content">
                                        <strong>{notif.titulo}</strong>
                                        <p>{notif.texto}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
