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

// --- OTIMIZAÇÃO 1: Definir helpers fora do componente para não recriar na memória ---
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

// Componente visual leve
const CustomEvent = ({ event }) => {
  if (event.type === 'feriado') {
    return (
      <div className="feriado-badge bounce-animation">
        <span className="feriado-icon">{getFeriadoIcon(event.title)}</span>
        <span className="feriado-text">{event.title}</span>
      </div>
    );
  }
  return <div className="ferias-event">{event.title}</div>;
};

export default function CalendarioFerias({ ferias = [] }) {
  const [feriados, setFeriados] = useState([]);
  const [anoAtual, setAnoAtual] = useState(new Date().getFullYear());

  // --- OTIMIZAÇÃO 2: Buscar API apenas quando o ANO mudar ---
  useEffect(() => {
    let isMounted = true;
    const fetchFeriados = async () => {
      const dados = await getFeriadosNacionais(anoAtual);
      if (isMounted) setFeriados(dados);
    };
    fetchFeriados();
    return () => { isMounted = false; };
  }, [anoAtual]);

  // --- OTIMIZAÇÃO 3: Memoizar a lista de eventos (Combina Férias + Feriados) ---
  // Só recalcula se 'ferias' ou 'feriados' mudarem, não em qualquer render do pai
  const eventos = useMemo(() => {
    const feriasFormatadas = ferias.map(f => ({
      id: f.id,
      title: `${f.funcionarios?.nome_completo || 'Colaborador'}`,
      start: new Date(f.data_inicio),
      end: new Date(f.data_fim),
      allDay: true,
      type: 'ferias',
      status: f.status
    }));
    return [...feriados, ...feriasFormatadas];
  }, [ferias, feriados]);

  // --- OTIMIZAÇÃO 4: Memoizar configurações do calendário ---
  const { components, messages } = useMemo(() => ({
    components: {
      event: CustomEvent // Passa a referência estável
    },
    messages: {
      next: "Próximo",
      previous: "Anterior",
      today: "Hoje",
      month: "Mês",
      week: "Semana",
      day: "Dia"
    }
  }), []);

  // --- OTIMIZAÇÃO 5: Callbacks estáveis para estilos ---
  const eventPropGetter = useCallback((event) => {
    if (event.type === 'feriado') {
      return {
        className: 'evento-feriado-container',
        style: { backgroundColor: 'transparent', border: 'none' }
      };
    }
    
    let bgColor = '#3b82f6';
    if (event.status === 'Agendada') bgColor = '#f59e0b';
    if (event.status === 'Gozo') bgColor = '#10b981';

    return { style: { backgroundColor: bgColor, borderRadius: '4px', fontSize: '0.85rem' } };
  }, []);

  const handleNavigate = useCallback((date) => {
    setAnoAtual(date.getFullYear());
  }, []);

  return (
    <div className="calendario-container fade-in">
      <Calendar
        localizer={localizer}
        events={eventos}
        startAccessor="start"
        endAccessor="end"
        style={{ height: 600 }}
        culture="pt-BR"
        components={components}
        eventPropGetter={eventPropGetter}
        onNavigate={handleNavigate}
        messages={messages}
      />
    </div>
  );
}