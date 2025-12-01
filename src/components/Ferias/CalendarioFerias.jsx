import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import ptBR from 'date-fns/locale/pt-BR';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

import { 
  getFeriasAprovadasParaCalendario, 
  updateAusencia, 
  checkConflitoDatas,
  validarRegrasCLT
} from '../../services/ausenciaService';

import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import './CalendarioFerias.css';

const locales = { 'pt-BR': ptBR };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });
const DnDCalendar = withDragAndDrop(Calendar);

function CalendarioFerias({ data: dataAtual, searchTerm, departamentoFiltro, onEventClick }) {
  const [events, setEvents] = useState([]);

  // 1. Ícones e Cores por Tipo
  const getConfigPorTipo = (tipo) => {
    switch(tipo) {
      case 'Férias': return { icon: '🏖️', bg: '#3b82f6', border: '#2563eb' }; // Azul
      case 'Banco de Horas': return { icon: '⏱️', bg: '#f59e0b', border: '#d97706' }; // Laranja
      case 'Folga Pessoal': 
      case 'Folga': return { icon: '📅', bg: '#8b5cf6', border: '#7c3aed' }; // Roxo
      case 'Atestado Médico': return { icon: '🤒', bg: '#ef4444', border: '#dc2626' }; // Vermelho
      default: return { icon: '📝', bg: '#64748b', border: '#475569' }; // Cinza
    }
  };

  const fetchEvents = useCallback(async () => {
    try {
      if (!dataAtual) return;
      const ano = dataAtual.getFullYear();
      const mes = dataAtual.getMonth() + 1;

      const dados = await getFeriasAprovadasParaCalendario(ano, mes, searchTerm, departamentoFiltro);

      const formattedEvents = dados.map(event => {
        const config = getConfigPorTipo(event.tipo);
        return {
          id: event.id,
          title: `${config.icon} ${event.funcionarios?.nome_completo || 'N/A'}`,
          start: new Date(event.data_inicio + 'T00:00:00'), 
          end: new Date(event.data_fim + 'T23:59:59'),
          resource: { ...event, config }, // Passa config para o styleGetter
          allDay: true
        };
      });

      setEvents(formattedEvents);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar calendário.");
    }
  }, [dataAtual, searchTerm, departamentoFiltro]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleEventDrop = async ({ event, start, end }) => {
    if (event.resource.status !== 'Pendente') {
      toast.error("Apenas solicitações Pendentes podem ser movidas.", { icon: '🔒' });
      return; 
    }

    try {
      const novaDataInicio = format(start, 'yyyy-MM-dd');
      const novaDataFim = format(end, 'yyyy-MM-dd');
      
      if (event.resource.tipo === 'Férias') {
         const checkCLT = validarRegrasCLT(novaDataInicio);
         if (!checkCLT.valido) toast(checkCLT.mensagem, { icon: '⚠️', duration: 5000 });
      }

      const temConflito = await checkConflitoDatas(event.resource.funcionario_id, novaDataInicio, novaDataFim, event.id);
      if (temConflito) {
        toast.error("Conflito de datas!");
        return; 
      }

      await updateAusencia(event.id, { data_inicio: novaDataInicio, data_fim: novaDataFim });
      toast.success("Reagendado!");
      fetchEvents(); 
    } catch (error) {
      toast.error(error.message);
      fetchEvents(); 
    }
  };

  const eventStyleGetter = (event) => {
    const config = event.resource.config;
    // Se for Pendente, fica mais claro/transparente
    const opacity = event.resource.status === 'Pendente' ? 0.7 : 1;
    const borderStyle = event.resource.status === 'Pendente' ? 'dashed' : 'solid';

    return {
      style: {
        backgroundColor: config.bg,
        borderColor: config.border,
        borderWidth: '2px',
        borderStyle: borderStyle,
        borderRadius: '6px',
        opacity: opacity,
        color: 'white',
        display: 'block',
        fontSize: '0.85rem',
        padding: '2px 5px'
      }
    };
  };

  return (
    <div className="calendario-container">
      <div style={{ height: '72vh', marginTop: '10px' }}>
        <DnDCalendar
          localizer={localizer}
          events={events}
          date={dataAtual}
          onNavigate={() => {}} 
          view="month"
          onView={() => {}} 
          toolbar={false}
          startAccessor="start"
          endAccessor="end"
          style={{ height: '100%' }}
          eventPropGetter={eventStyleGetter}
          onEventDrop={handleEventDrop}
          draggableAccessor={(event) => event.resource.status === 'Pendente'}
          resizable={false}
          onSelectEvent={(event) => onEventClick && onEventClick(event.id)}
          messages={{ noEventsInRange: "Nenhuma ausência encontrada.", showMore: total => `+${total} mais` }}
          culture='pt-BR'
        />
      </div>
       <div className="calendario-legenda">
        <div className="legenda-item"><span className="dot" style={{background:'#3b82f6'}}></span> Férias</div>
        <div className="legenda-item"><span className="dot" style={{background:'#f59e0b'}}></span> Banco Horas</div>
        <div className="legenda-item"><span className="dot" style={{background:'#8b5cf6'}}></span> Folgas</div>
        <div className="legenda-item"><span className="dot" style={{background:'#ef4444'}}></span> Saúde</div>
        <div className="legenda-divider">|</div>
        <div className="legenda-item"><span className="dot-border solid"></span> Aprovado</div>
        <div className="legenda-item"><span className="dot-border dashed"></span> Pendente</div>
      </div>
    </div>
  );
}

export default CalendarioFerias;