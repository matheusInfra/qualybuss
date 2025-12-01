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

import { getFeriadosAno } from '../../services/feriadoService';

import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import './CalendarioFerias.css';

const locales = { 'pt-BR': ptBR };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });
const DnDCalendar = withDragAndDrop(Calendar);

// --- COMPONENTE CUSTOMIZADO (ATUALIZADO) ---
const EventoCustomizado = ({ event }) => {
  // 1. Se for Feriado: Bolinha com Ícone Material Symbols
  if (event.isFeriado) {
    return (
      <div className="holiday-wrapper">
        <div className="holiday-dot">
          {/* Ícone 'grade' é uma estrela, ou 'flag' para bandeira */}
          <span className="material-symbols-outlined" style={{ fontSize: '14px', fontWeight: 'bold' }}>
            grade
          </span>
        </div>
        <div className="holiday-tooltip">
          <span className="tooltip-title">{event.title.replace('🎉 ', '')}</span>
          <span className="tooltip-desc">Feriado Nacional</span>
        </div>
      </div>
    );
  }

  // 2. Se for Ausência Normal: Texto com Emoji (Mantido para leitura rápida)
  return (
    <div className="event-content-normal">
      {event.title}
    </div>
  );
};

function CalendarioFerias({ data: dataAtual, searchTerm, departamentoFiltro, onEventClick }) {
  const [events, setEvents] = useState([]);

  const getIconePorTipo = (tipo) => {
    if (tipo === 'Férias') return '🏖️';
    if (tipo.includes('Atestado')) return '🤒';
    if (tipo.includes('Licença')) return '👶';
    // Feriado não precisa mais de ícone no título pois o componente customizado trata
    return '📅';
  };

  const fetchEvents = useCallback(async () => {
    try {
      const dataRef = dataAtual || new Date();
      const ano = dataRef.getFullYear();
      const mes = dataRef.getMonth() + 1;

      // Busca Ausências
      const dadosAusencias = await getFeriasAprovadasParaCalendario(ano, mes, searchTerm, departamentoFiltro);

      const ausenciasFormatadas = dadosAusencias.map(event => ({
        id: event.id,
        title: `${getIconePorTipo(event.tipo)} ${event.funcionarios?.nome_completo || 'N/A'}`,
        start: new Date(event.data_inicio + 'T00:00:00'), 
        end: new Date(event.data_fim + 'T23:59:59'),
        resource: event,
        allDay: true,
        isFeriado: false
      }));

      // Busca Feriados
      let feriadosFormatados = [];
      if (!searchTerm) {
        const feriadosMap = await getFeriadosAno(ano);
        
        feriadosFormatados = Object.entries(feriadosMap).map(([dataStr, nome]) => {
          const [y, m, d] = dataStr.split('-').map(Number);
          const dataFeriado = new Date(y, m - 1, d, 12, 0, 0); 

          return {
            id: `feriado-${dataStr}`,
            title: nome, // Removemos o emoji daqui, o ícone será visual
            start: dataFeriado,
            end: dataFeriado,
            resource: { tipo: 'Feriado', status: 'Bloqueado' },
            allDay: true,
            isFeriado: true
          };
        });
      }

      setEvents([...feriadosFormatados, ...ausenciasFormatadas]);

    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar calendário.");
    }
  }, [dataAtual, searchTerm, departamentoFiltro]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleEventDrop = async ({ event, start, end }) => {
    if (event.isFeriado) return;

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
    // Para Feriado: Transparente (a bolinha flutua)
    if (event.isFeriado) {
      return {
        style: {
          backgroundColor: 'transparent',
          color: 'transparent',
          border: 'none',
          boxShadow: 'none',
          pointerEvents: 'auto',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 0,
          margin: 0,
          height: '100%'
        }
      };
    }

    // Para Ausências
    let backgroundColor = '#3174ad'; 
    if (event.resource.status === 'Aprovado') backgroundColor = '#10B981';
    if (event.resource.status === 'Pendente') backgroundColor = '#F59E0B';
    if (event.resource.status === 'Rejeitado') backgroundColor = '#EF4444';
    if (event.resource.tipo === 'Banco de Horas') backgroundColor = '#f59e0b';
    if (event.resource.tipo === 'Folga' || event.resource.tipo === 'Folga Pessoal') backgroundColor = '#8b5cf6';

    return {
      style: {
        backgroundColor,
        borderRadius: '6px',
        opacity: 0.95,
        color: 'white',
        border: '0px',
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
          
          components={{ event: EventoCustomizado }}
          
          eventPropGetter={eventStyleGetter}
          onEventDrop={handleEventDrop}
          draggableAccessor={(event) => !event.isFeriado && event.resource.status === 'Pendente'}
          resizable={false}
          onSelectEvent={(event) => !event.isFeriado && onEventClick && onEventClick(event.id)}
          messages={{ noEventsInRange: "Nenhuma ausência.", showMore: total => `+${total} mais` }}
          culture='pt-BR'
        />
      </div>
       <div className="calendario-legenda" style={{marginTop: '10px', display:'flex', gap:'15px', fontSize:'0.8rem', color:'#64748b', paddingLeft:'10px'}}>
        <div style={{display:'flex', alignItems:'center', gap:'6px'}}>
          <div className="holiday-dot" style={{width: 16, height: 16, fontSize: 10}}>
            <span className="material-symbols-outlined" style={{fontSize: '10px'}}>grade</span>
          </div> Feriado
        </div>
        <div style={{display:'flex', alignItems:'center', gap:'6px'}}>
          <span style={{width:10, height:10, borderRadius:'50%', background:'#10B981'}}></span> Aprovado
        </div>
        <div style={{display:'flex', alignItems:'center', gap:'6px'}}>
          <span style={{width:10, height:10, borderRadius:'50%', background:'#F59E0B'}}></span> Pendente
        </div>
        <div style={{display:'flex', alignItems:'center', gap:'6px'}}>
          <span style={{width:10, height:10, borderRadius:'50%', background:'#8b5cf6'}}></span> Folga
        </div>
      </div>
    </div>
  );
}

export default CalendarioFerias;