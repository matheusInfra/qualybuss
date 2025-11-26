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
import { supabase } from '../../services/supabaseClient';
import { updateAusencia } from '../../services/ausenciaService';

// Estilos
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import './CalendarioFerias.css';

// Configuração do Localizador (Datas em Português)
const locales = {
  'pt-BR': ptBR,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

const DnDCalendar = withDragAndDrop(Calendar);

function CalendarioFerias() {
  const [events, setEvents] = useState([]);
  const navigate = useNavigate();

  // 1. BUSCAR DADOS
  const fetchEvents = useCallback(async () => {
    try {
      // Busca férias e folgas (Aprovadas e Pendentes)
      // Ignora Rejeitados para não poluir o calendário
      const { data, error } = await supabase
        .from('solicitacoes_ausencia')
        .select(`
          id,
          data_inicio,
          data_fim,
          tipo,
          status,
          funcionarios ( nome_completo )
        `)
        .neq('status', 'Rejeitado');

      if (error) throw error;

      // Formata para o padrão do BigCalendar
      const formattedEvents = data.map(event => ({
        id: event.id,
        title: `${event.funcionarios?.nome_completo} - ${event.tipo}`,
        start: new Date(event.data_inicio + 'T00:00:00'), // Garante fuso horário correto
        end: new Date(event.data_fim + 'T23:59:59'),
        resource: event, // Guarda o objeto original para checagens
        allDay: true
      }));

      setEvents(formattedEvents);
    } catch (error) {
      console.error("Erro ao carregar calendário:", error);
      toast.error("Erro ao sincronizar calendário.");
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // 2. LÓGICA DE BLOQUEIO E ATUALIZAÇÃO (O "MOTOR")
  const handleEventDrop = async ({ event, start, end }) => {
    // --- REGRA DE NEGÓCIO: BLOQUEIO DE SEGURANÇA ---
    if (event.resource.status !== 'Pendente') {
      toast.error(
        "Registro Consolidado (Aprovado). Para alterar datas, utilize o menu 'Ajustes' > 'Retificar'.",
        { duration: 5000, icon: '🔒' }
      );
      return; // Cancela a ação visualmente e não chama o backend
    }

    // Se for Pendente, permite a edição direta (Drag & Drop)
    try {
      const novaDataInicio = format(start, 'yyyy-MM-dd');
      const novaDataFim = format(end, 'yyyy-MM-dd');

      await updateAusencia(event.id, {
        data_inicio: novaDataInicio,
        data_fim: novaDataFim
      });

      toast.success("Datas atualizadas (Solicitação Pendente)");
      fetchEvents(); // Recarrega para confirmar
    } catch (error) {
      toast.error("Erro ao mover evento: " + error.message);
    }
  };

  // 3. ESTILIZAÇÃO CONDICIONAL (CORES POR STATUS)
  const eventStyleGetter = (event) => {
    let backgroundColor = '#3174ad'; // Padrão
    let borderColor = '#265985';

    if (event.resource.status === 'Aprovado') {
      backgroundColor = '#10B981'; // Verde (Sucesso)
      borderColor = '#059669';
    } else if (event.resource.status === 'Pendente') {
      backgroundColor = '#F59E0B'; // Laranja (Atenção)
      borderColor = '#D97706';
    }

    return {
      style: {
        backgroundColor,
        borderColor,
        borderRadius: '4px',
        opacity: 0.9,
        color: 'white',
        border: '0px',
        display: 'block'
      }
    };
  };

  // 4. INTERAÇÃO AO CLICAR
  const handleSelectEvent = (event) => {
    if (event.resource.status === 'Aprovado') {
        // Sugestão visual para o usuário ir para a tela certa
        toast((t) => (
            <span>
              <b>Registro Aprovado</b><br/>
              Deseja retificar este lançamento?
              <br/>
              <button 
                onClick={() => { navigate('/ajustes'); toast.dismiss(t.id); }}
                style={{marginTop:'8px', padding:'4px 8px', background:'#fff', border:'1px solid #ccc', borderRadius:'4px', cursor:'pointer'}}
              >
                Ir para Ajustes
              </button>
            </span>
          ), { icon: 'ℹ️' });
    } else {
        // Se for pendente, poderia abrir modal de edição simples
        toast("Solicitação Pendente aguardando aprovação.");
    }
  };

  return (
    <div className="calendario-container">
      <div className="calendario-header-info">
        <h3>📅 Mapa de Ausências</h3>
        <div className="legendas">
          <span className="legenda-item"><span className="dot aprovado"></span> Aprovado (Fixo)</span>
          <span className="legenda-item"><span className="dot pendente"></span> Pendente (Editável)</span>
        </div>
      </div>

      <div style={{ height: '75vh', marginTop: '20px' }}>
        <DnDCalendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: '100%' }}
          
          // Customizações
          eventPropGetter={eventStyleGetter}
          
          // Eventos de Drag & Drop
          onEventDrop={handleEventDrop}
          onEventResize={handleEventDrop} // Usa a mesma lógica para redimensionar
          draggableAccessor={(event) => event.resource.status === 'Pendente'} // Dica visual: só deixa arrastar se for pendente
          
          // Eventos de Clique
          onSelectEvent={handleSelectEvent}
          
          // Textos em Português
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
            noEventsInRange: "Sem ausências neste período."
          }}
          culture='pt-BR'
        />
      </div>
    </div>
  );
}

export default CalendarioFerias;