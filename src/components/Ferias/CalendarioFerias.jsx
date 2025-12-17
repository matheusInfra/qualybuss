import React, { useState, useEffect } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import ptBR from 'date-fns/locale/pt-BR';
import 'react-big-calendar/lib/css/react-big-calendar.css';

// Importe o serviço corrigido
import { getFeriadosNacionais } from '../../services/feriadoService';
import './CalendarioFerias.css';

const locales = { 'pt-BR': ptBR };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

// --- MAPEAMENTO DE ÍCONES (Inteligência Visual) ---
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
  return '📅'; // Ícone padrão
};

// --- COMPONENTE CUSTOMIZADO PARA O EVENTO ---
const CustomEvent = ({ event }) => {
  if (event.type === 'feriado') {
    return (
      <div className="feriado-badge bounce-animation">
        <span className="feriado-icon">{getFeriadoIcon(event.title)}</span>
        <span className="feriado-text">{event.title}</span>
      </div>
    );
  }
  
  // Renderização padrão para férias normais
  return (
    <div className="ferias-event">
      {event.title}
    </div>
  );
};

export default function CalendarioFerias({ ferias = [] }) {
  const [eventos, setEventos] = useState([]);
  const [anoAtual, setAnoAtual] = useState(new Date().getFullYear());

  // Carrega Feriados e junta com Férias
  useEffect(() => {
    const carregarDados = async () => {
      // 1. Busca Feriados
      const feriados = await getFeriadosNacionais(anoAtual);
      
      // 2. Formata as Férias que vieram via prop
      const feriasFormatadas = ferias.map(f => ({
        id: f.id,
        title: `Férias: ${f.funcionarios?.nome_completo || 'Colaborador'}`,
        start: new Date(f.data_inicio),
        end: new Date(f.data_fim),
        allDay: true,
        type: 'ferias', // Identificador
        status: f.status
      }));

      // 3. Junta tudo
      setEventos([...feriados, ...feriasFormatadas]);
    };

    carregarDados();
  }, [ferias, anoAtual]);

  // Estilização condicional das células
  const eventPropGetter = (event) => {
    if (event.type === 'feriado') {
      return {
        className: 'evento-feriado-container', // Classe CSS específica
        style: {
          backgroundColor: 'transparent', // Removemos o fundo padrão para usar o nosso badge
          color: 'black',
          border: 'none'
        }
      };
    }
    
    // Estilo para Férias
    let bgColor = '#3b82f6'; // Azul padrão
    if (event.status === 'Agendada') bgColor = '#f59e0b'; // Laranja
    if (event.status === 'Gozo') bgColor = '#10b981'; // Verde

    return {
      style: { backgroundColor: bgColor, borderRadius: '6px' }
    };
  };

  const handleNavigate = (date) => {
    setAnoAtual(date.getFullYear());
  };

  return (
    <div className="calendario-container fade-in">
      <Calendar
        localizer={localizer}
        events={eventos}
        startAccessor="start"
        endAccessor="end"
        style={{ height: 600 }}
        culture="pt-BR"
        components={{
          event: CustomEvent // Injeta nosso componente customizado
        }}
        eventPropGetter={eventPropGetter}
        onNavigate={handleNavigate}
        messages={{
          next: "Próximo",
          previous: "Anterior",
          today: "Hoje",
          month: "Mês",
          week: "Semana",
          day: "Dia"
        }}
      />
    </div>
  );
}