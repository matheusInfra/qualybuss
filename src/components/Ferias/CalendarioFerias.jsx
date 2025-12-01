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

// Serviços
import { 
  getFeriasAprovadasParaCalendario, 
  updateAusencia, 
  checkConflitoDatas,
  validarRegrasCLT
} from '../../services/ausenciaService';

// Estilos
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import './CalendarioFerias.css';

// Configuração do Localizador
const locales = { 'pt-BR': ptBR };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

const DnDCalendar = withDragAndDrop(Calendar);

function CalendarioFerias({ 
  data: dataAtual,      // Data controlada pela página pai
  searchTerm,           // Filtro de texto
  departamentoFiltro,   // Filtro de departamento
  onEventClick          // Função para abrir o modal no pai
}) {
  const [events, setEvents] = useState([]);
  const navigate = useNavigate();

  // 1. BUSCAR DADOS (Reativo aos filtros e data)
  const fetchEvents = useCallback(async () => {
    try {
      if (!dataAtual) return;

      const ano = dataAtual.getFullYear();
      const mes = dataAtual.getMonth() + 1; // Ajuste 0-11 para 1-12

      const dados = await getFeriasAprovadasParaCalendario(ano, mes, searchTerm, departamentoFiltro);

      const formattedEvents = dados.map(event => ({
        id: event.id,
        title: `${event.funcionarios?.nome_completo || 'N/A'} - ${event.tipo}`,
        // Adiciona hora fixa para evitar problemas de fuso no grid
        start: new Date(event.data_inicio + 'T00:00:00'), 
        end: new Date(event.data_fim + 'T23:59:59'),
        resource: event,
        allDay: true
      }));

      setEvents(formattedEvents);
    } catch (error) {
      console.error("Erro ao carregar calendário:", error);
      toast.error("Erro ao sincronizar calendário.");
    }
  }, [dataAtual, searchTerm, departamentoFiltro]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // 2. LÓGICA DE BLOQUEIO E ATUALIZAÇÃO (Drag & Drop)
  const handleEventDrop = async ({ event, start, end }) => {
    // Regra 1: Apenas Pendentes podem ser movidos
    if (event.resource.status !== 'Pendente') {
      toast.error("Apenas solicitações Pendentes podem ser reagendadas aqui.", { icon: '🔒' });
      return; 
    }

    try {
      const novaDataInicio = format(start, 'yyyy-MM-dd');
      const novaDataFim = format(end, 'yyyy-MM-dd');
      const funcionarioId = event.resource.funcionario_id;

      // Regra 2: Validação CLT (Visual)
      // Avisa mas não bloqueia rígido no drag-and-drop para não frustrar UX, mas dá o alerta.
      if (event.resource.tipo === 'Férias') {
          const checkCLT = validarRegrasCLT(novaDataInicio);
          if (!checkCLT.valido) {
             toast(checkCLT.mensagem, { icon: '⚠️', duration: 5000 });
          }
      }

      // Regra 3: Validação de Conflito (Passando ID do evento para excluir da checagem)
      const temConflito = await checkConflitoDatas(funcionarioId, novaDataInicio, novaDataFim, event.id);
      
      if (temConflito) {
        toast.error("Data indisponível: Conflita com outra ausência existente.");
        return; // Cancela a ação
      }

      await updateAusencia(event.id, {
        data_inicio: novaDataInicio,
        data_fim: novaDataFim
      });

      toast.success("Datas atualizadas (Pendente)");
      fetchEvents(); // Recarrega visualização
    } catch (error) {
      toast.error("Erro ao mover: " + error.message);
      fetchEvents(); // Reverte visualmente
    }
  };

  // 3. ESTILIZAÇÃO POR STATUS
  const eventStyleGetter = (event) => {
    let backgroundColor = '#3174ad'; 
    let borderColor = '#265985';

    if (event.resource.status === 'Aprovado') {
      backgroundColor = '#10B981'; // Verde
      borderColor = '#059669';
    } else if (event.resource.status === 'Pendente') {
      backgroundColor = '#F59E0B'; // Laranja
      borderColor = '#D97706';
    } else if (event.resource.status === 'Rejeitado') {
      backgroundColor = '#EF4444'; // Vermelho
      borderColor = '#B91C1C';
    }

    return {
      style: {
        backgroundColor,
        borderColor,
        borderRadius: '4px',
        opacity: 0.9,
        color: 'white',
        border: '0px',
        display: 'block',
        fontSize: '0.85rem'
      }
    };
  };

  // 4. INTERAÇÃO AO CLICAR
  const handleSelectEvent = (event) => {
    if (onEventClick) {
      onEventClick(event.id);
    }
  };

  return (
    <div className="calendario-container">
      <div style={{ height: '72vh', marginTop: '10px' }}>
        <DnDCalendar
          localizer={localizer}
          events={events}
          
          // Controle Externo (FeriasPage)
          date={dataAtual}
          onNavigate={() => {}} 
          view="month"
          onView={() => {}} 
          toolbar={false}

          startAccessor="start"
          endAccessor="end"
          style={{ height: '100%' }}
          
          eventPropGetter={eventStyleGetter}
          
          // Drag & Drop
          onEventDrop={handleEventDrop}
          draggableAccessor={(event) => event.resource.status === 'Pendente'}
          resizable={false}
          
          // Clique
          onSelectEvent={handleSelectEvent}
          
          messages={{
            next: "Próximo",
            previous: "Anterior",
            today: "Hoje",
            month: "Mês",
            week: "Semana",
            day: "Dia",
            agenda: "Agenda",
            date: "Data",
            time: "Hora",
            event: "Evento",
            noEventsInRange: "Nenhuma ausência encontrada com estes filtros."
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
      </div>
    </div>
  );
}

export default CalendarioFerias;