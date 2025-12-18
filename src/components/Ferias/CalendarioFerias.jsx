import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import ptBR from 'date-fns/locale/pt-BR';
import 'react-big-calendar/lib/css/react-big-calendar.css';

import { getFeriadosNacionais } from '../../services/feriadoService';
import './CalendarioFerias.css';

const locales = { 'pt-BR': ptBR };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

// --- HELPERS VISUAIS (Definidos fora para performance) ---
const getFeriadoIcon = (nome) => {
  const n = nome.toLowerCase();
  if (n.includes('confraternização') || n.includes('ano novo')) return '🥂';
  if (n.includes('carnaval')) return '🎭';
  if (n.includes('paixão') || n.includes('páscoa')) return '🍫';
  if (n.includes('tiradentes')) return '🇧🇷';
  if (n.includes('trabalho')) return '👷';
  if (n.includes('independência')) return '🗡️';
  if (n.includes('aparecida') || n.includes('padroeira')) return '🙏';
  if (n.includes('finados')) return '🕯️';
  if (n.includes('república')) return '🏛️';
  if (n.includes('natal')) return '🎄';
  return '📅';
};

const CustomEvent = ({ event }) => {
  if (event.type === 'feriado') {
    return (
      <div className="feriado-badge bounce-animation">
        <span className="feriado-icon">{getFeriadoIcon(event.title)}</span>
        <span className="feriado-text">{event.title}</span>
      </div>
    );
  }
  return (
    <div className="ferias-event">
      <strong>{event.title}</strong>
      {event.departamento && <span style={{fontSize: '0.7em', display:'block'}}>{event.departamento}</span>}
    </div>
  );
};

export default function CalendarioFerias({ ferias = [], data, onEventClick }) {
  const [feriados, setFeriados] = useState([]);
  
  // Define o ano atual com base na prop 'data' recebida do pai, ou usa o atual como fallback
  const anoExibido = data ? data.getFullYear() : new Date().getFullYear();

  // --- BUSCA DE FERIADOS (Apenas quando o ano muda) ---
  useEffect(() => {
    let isMounted = true;
    const fetchFeriados = async () => {
      // Evita chamadas desnecessárias se já tivermos feriados desse ano (opcional, mas simples assim é seguro)
      const dados = await getFeriadosNacionais(anoExibido);
      if (isMounted) setFeriados(dados);
    };
    fetchFeriados();
    return () => { isMounted = false; };
  }, [anoExibido]);

  // --- PREPARAÇÃO DE EVENTOS (Férias + Feriados) ---
  const eventos = useMemo(() => {
    const feriasFormatadas = ferias.map(f => {
      // Tratamento de segurança para dados opcionais
      const nomeFuncionario = f.funcionarios?.nome_completo || 'Colaborador';
      const departamento = f.funcionarios?.departamento || '';
      
      // Ajuste de fuso horário simples (adiciona 'T12:00' para garantir meio-dia e evitar recuo de dia)
      // Ou usa new Date(ano, mes, dia) diretamente se a string for YYYY-MM-DD
      const start = new Date(f.data_inicio + 'T12:00:00');
      const end = new Date(f.data_fim + 'T12:00:00');

      return {
        id: f.id,
        title: nomeFuncionario,
        departamento: departamento,
        start: start,
        end: end,
        allDay: true,
        type: 'ferias',
        status: f.status,
        resource: f // Guarda o objeto original se precisar
      };
    });
    
    return [...feriados, ...feriasFormatadas];
  }, [ferias, feriados]);

  // --- CONFIGURAÇÕES DO CALENDÁRIO ---
  const { components, messages } = useMemo(() => ({
    components: {
      event: CustomEvent
    },
    messages: {
      next: "Próximo",
      previous: "Anterior",
      today: "Hoje",
      month: "Mês",
      week: "Semana",
      day: "Dia",
      noEventsInRange: "Nenhuma férias neste período."
    }
  }), []);

  // --- ESTILIZAÇÃO DOS EVENTOS ---
  const eventPropGetter = useCallback((event) => {
    // 1. Estilo para Feriados
    if (event.type === 'feriado') {
      return {
        className: 'evento-feriado-container',
        style: { backgroundColor: 'transparent', border: 'none', color: '#64748b' }
      };
    }
    
    // 2. Estilo para Férias (baseado no status)
    let bgColor = '#3b82f6'; // Azul (Padrão/Aprovado)
    let borderLeft = '4px solid #1d4ed8';

    if (event.status === 'Agendada' || event.status === 'Pendente') {
      bgColor = '#f59e0b'; // Laranja
      borderLeft = '4px solid #b45309';
    } else if (event.status === 'Gozo') {
      bgColor = '#10b981'; // Verde
      borderLeft = '4px solid #047857';
    }

    return { 
      style: { 
        backgroundColor: bgColor, 
        borderLeft: borderLeft,
        borderRadius: '4px', 
        fontSize: '0.85rem',
        color: 'white',
        opacity: 0.95
      } 
    };
  }, []);

  // Handler para clique no evento (Edição)
  const handleSelectEvent = useCallback((event) => {
    if (event.type === 'ferias' && onEventClick) {
      onEventClick(event.id);
    }
  }, [onEventClick]);

  // Handler vazio para onNavigate interno, já que controlamos via prop 'date'
  // Mas é necessário passá-lo para evitar erros em algumas versões
  const handleNavigate = useCallback(() => {}, []);

  return (
    <div className="calendario-container fade-in">
      <Calendar
        localizer={localizer}
        events={eventos}
        
        // Controles de Data (Essencial para funcionar com o pai)
        date={data} 
        onNavigate={handleNavigate}
        toolbar={false} // Desabilita toolbar interna pois já temos a externa (ControlesCalendario)
        
        startAccessor="start"
        endAccessor="end"
        style={{ height: 650 }}
        culture="pt-BR"
        
        components={components}
        eventPropGetter={eventPropGetter}
        messages={messages}
        
        // Interatividade
        onSelectEvent={handleSelectEvent}
        popup={true} // Mostra popup se houver muitos eventos no dia
      />
    </div>
  );
}