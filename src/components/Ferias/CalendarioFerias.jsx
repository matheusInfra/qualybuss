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

  // Ícones para leitura rápida
  const getIconePorTipo = (tipo) => {
    if (tipo === 'Férias') return '🏖️';
    if (tipo.includes('Atestado')) return '🤒';
    if (tipo.includes('Licença')) return '👶';
    return '📅';
  };

  const fetchEvents = useCallback(async () => {
    try {
      if (!dataAtual) return;
      const ano = dataAtual.getFullYear();
      const mes = dataAtual.getMonth() + 1;

      const dados = await getFeriasAprovadasParaCalendario(ano, mes, searchTerm, departamentoFiltro);

      const formattedEvents = dados.map(event => ({
        id: event.id,
        title: `${getIconePorTipo(event.tipo)} ${event.funcionarios?.nome_completo || 'N/A'}`,
        start: new Date(event.data_inicio + 'T00:00:00'), 
        end: new Date(event.data_fim + 'T23:59:59'),
        resource: event,
        allDay: true
      }));

      setEvents(formattedEvents);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar calendário.");
    }
  }, [dataAtual, searchTerm, departamentoFiltro]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Drag & Drop Inteligente
  const handleEventDrop = async ({ event, start, end }) => {
    if (event.resource.status !== 'Pendente') {
      toast.error("Apenas solicitações Pendentes podem ser movidas.", { icon: '🔒' });
      return; 
    }

    try {
      const novaDataInicio = format(start, 'yyyy-MM-dd');
      const novaDataFim = format(end, 'yyyy-MM-dd');
      
      // Validação CLT
      if (event.resource.tipo === 'Férias') {
         const checkCLT = validarRegrasCLT(novaDataInicio);
         if (!checkCLT.valido) {
            toast(checkCLT.mensagem, { icon: '⚠️', duration: 5000 });
         }
      }

      // Validação de Conflito (Ignorando o próprio evento)
      const temConflito = await checkConflitoDatas(event.resource.funcionario_id, novaDataInicio, novaDataFim, event.id);
      
      if (temConflito) {
        toast.error("Data indisponível: Conflita com outra ausência.");
        return; 
      }

      await updateAusencia(event.id, {
        data_inicio: novaDataInicio,
        data_fim: novaDataFim
      });

      toast.success("Reagendado com sucesso!");
      fetchEvents(); 
    } catch (error) {
      toast.error(error.message);
      fetchEvents(); 
    }
  };

  const eventStyleGetter = (event) => {
    let backgroundColor = '#3174ad'; 
    if (event.resource.status === 'Aprovado') backgroundColor = '#10B981';
    if (event.resource.status === 'Pendente') backgroundColor = '#F59E0B';
    if (event.resource.status === 'Rejeitado') backgroundColor = '#EF4444';

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
          eventPropGetter={eventStyleGetter}
          onEventDrop={handleEventDrop}
          draggableAccessor={(event) => event.resource.status === 'Pendente'}
          resizable={false}
          onSelectEvent={(event) => onEventClick && onEventClick(event.id)}
          messages={{
            noEventsInRange: "Nenhuma ausência encontrada.",
            showMore: total => `+${total} mais`
          }}
          culture='pt-BR'
        />
      </div>
       <div className="calendario-legenda" style={{marginTop: '10px', display:'flex', gap:'15px', fontSize:'0.8rem', color:'#64748b', paddingLeft:'10px'}}>
        <div style={{display:'flex', alignItems:'center', gap:'6px'}}>
          <span style={{width:10, height:10, borderRadius:'50%', background:'#10B981'}}></span> Aprovado
        </div>
        <div style={{display:'flex', alignItems:'center', gap:'6px'}}>
          <span style={{width:10, height:10, borderRadius:'50%', background:'#F59E0B'}}></span> Pendente (Arrastável)
        </div>
        <div style={{marginLeft: 'auto'}}>
           <small>Dica: Arraste os itens laranja para reagendar.</small>
        </div>
      </div>
    </div>
  );
}

export default CalendarioFerias;