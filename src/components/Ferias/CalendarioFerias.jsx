// src/components/Ferias/CalendarioFerias.jsx
import React, { useMemo, useState, useEffect } from 'react';
import useSWR from 'swr';
import { toast } from 'react-hot-toast'; // Importante para o feedback de segurança
import { generateCalendarGrid } from '../../utils/dateUtils';
import { getFeriasAprovadasParaCalendario } from '../../services/ausenciaService';
import { getFeriadosAno } from '../../services/feriadoService';
import { getColorForString } from '../../utils/colorUtils';
import './CalendarioFerias.css';

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const dateToLocalISO = (dateStr) => {
  if (!dateStr) return null;
  const datePart = dateStr.split('T')[0];
  const parts = datePart.split('-');
  return new Date(parts[0], parts[1] - 1, parts[2]);
};

// Lógica de posicionamento e design dos cards
const calcularPosicaoEventos = (ferias, grid) => {
  const eventos = [];
  if (!ferias || ferias.length === 0) return eventos;

  const weekTracks = Array(6).fill(null).map(() => []); 
  const CARD_HEIGHT = 24;
  const TOP_OFFSET = 32;
  const inicioGrade = dateToLocalISO(`${grid[0].ano}-${grid[0].mes + 1}-${grid[0].dia}`);
  const fimGrade = dateToLocalISO(`${grid[41].ano}-${grid[41].mes + 1}-${grid[41].dia}`);

  const feriasOrdenadas = [...ferias].sort((a, b) => {
    const duracaoA = new Date(a.data_fim) - new Date(a.data_inicio);
    const duracaoB = new Date(b.data_fim) - new Date(b.data_inicio);
    return duracaoB - duracaoA;
  });

  feriasOrdenadas.forEach(item => {
    const inicioFerias = dateToLocalISO(item.data_inicio);
    const fimFerias = dateToLocalISO(item.data_fim);

    if (!inicioFerias || !fimFerias || fimFerias < inicioGrade || inicioFerias > fimGrade) return;

    const inicioReal = inicioFerias < inicioGrade ? inicioGrade : inicioFerias;
    const fimReal = fimFerias > fimGrade ? fimGrade : fimFerias;

    const startIndex = Math.max(0, Math.ceil((inicioReal - inicioGrade) / (1000 * 60 * 60 * 24)));
    const endIndex = Math.min(41, Math.ceil((fimReal - inicioGrade) / (1000 * 60 * 60 * 24)));

    let indexAtual = startIndex;
    
    // --- LÓGICA DE CORES E STATUS (BLINDAGEM VISUAL) ---
    let colors;
    if (item.status === 'Pendente') {
      // Laranja para Rascunho/Pendente
      colors = { bg: '#fff7ed', border: '#f97316', text: '#c2410c' }; 
    } else if (item.tipo === 'Folga Pessoal') {
      // Verde Claro para Folgas
      colors = { bg: '#f0fdf4', border: '#16a34a', text: '#15803d' }; 
    } else {
      // Cor Gerada pelo Nome para Férias Oficiais
      colors = getColorForString(item.funcionario_id); 
    }

    const nomeExibicao = item.funcionarios?.nome_completo || 'Desconhecido';

    while (indexAtual <= endIndex) {
      const semanaIndex = Math.floor(indexAtual / 7);
      if (semanaIndex > 5) break; 

      const diaDaSemana = indexAtual % 7;
      const diasRestantesNaSemana = 7 - diaDaSemana;
      const diasRestantesNoEvento = (endIndex - indexAtual) + 1;
      const diasNestaLinha = Math.min(diasRestantesNaSemana, diasRestantesNoEvento);

      let trilho = 0;
      while (true) {
        const isOcupado = weekTracks[semanaIndex][trilho] && weekTracks[semanaIndex][trilho] >= indexAtual;
        if (!isOcupado) break;
        trilho++;
      }

      weekTracks[semanaIndex][trilho] = indexAtual + diasNestaLinha - 1;

      eventos.push({
        id: `${item.id}-${indexAtual}`,
        realId: item.id,
        nome: item.tipo === 'Folga Pessoal' ? `Folga: ${nomeExibicao}` : nomeExibicao,
        top: `calc(${semanaIndex} * (100% / 6) + ${TOP_OFFSET + (trilho * CARD_HEIGHT)}px)`,
        left: `calc(${diaDaSemana} * (100% / 7))`,
        width: `calc(${diasNestaLinha} * (100% / 7))`,
        colors: colors,
        status: item.status, // Passa o status para controle de clique
        tipo: item.tipo
      });
      
      indexAtual += diasNestaLinha;
    }
  });

  return eventos;
};

function CalendarioFerias({ data, searchTerm, departamentoFiltro, onEventClick }) {
  const ano = data.getFullYear();
  const mes = data.getMonth() + 1;
  const [feriados, setFeriados] = useState({});
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, text: '' });

  useEffect(() => {
    getFeriadosAno(ano).then(setFeriados);
  }, [ano]);

  const calendarGrid = generateCalendarGrid(data);

  // Busca dados atualizados (SWR garante cache e revalidação)
  const { data: ferias, error, isLoading } = useSWR(
    ['ferias', ano, mes, searchTerm, departamentoFiltro], 
    () => getFeriasAprovadasParaCalendario(ano, mes, searchTerm, departamentoFiltro),
    { revalidateOnFocus: true }
  );

  const eventosDoCalendario = useMemo(() => {
    return calcularPosicaoEventos(ferias, calendarGrid);
  }, [ferias, calendarGrid]);

  // --- LÓGICA DE SEGURANÇA NO CLIQUE ---
  const handleCardClick = (e, evento) => {
    e.stopPropagation();
    
    // REGRA DE BLINDAGEM:
    // Apenas registros 'Pendente' podem ser editados diretamente no fluxo de trabalho rápido.
    if (evento.status === 'Pendente') {
      if (onEventClick) {
        onEventClick(evento.realId);
      }
    } else {
      // Se for Aprovado/Concluído, mostra alerta de segurança
      toast(
        (t) => (
          <div style={{fontSize: '0.9rem'}}>
            <b>Registro Consolidado <span role="img" aria-label="lock">🔒</span></b>
            <div style={{marginTop:'4px', color:'#475569'}}>
              Para alterar este registro oficial, utilize o módulo de <b>Ajustes e Correções</b> com justificativa.
            </div>
          </div>
        ),
        { 
          duration: 5000,
          position: 'top-center',
          style: {
            border: '1px solid #e2e8f0',
            padding: '16px',
            color: '#1e293b',
          },
        }
      );
    }
  };

  const handleHolidayHover = (e, name) => {
    const rect = e.target.getBoundingClientRect();
    setTooltip({ visible: true, x: rect.left, y: rect.top - 30, text: name });
  };

  const handleHolidayLeave = () => { setTooltip({ visible: false, x: 0, y: 0, text: '' }); };

  const hoje = new Date();
  const hojeStr = `${hoje.getFullYear()}-${hoje.getMonth()}-${hoje.getDate()}`;

  return (
    <div className="calendar-container">
      <div className="calendar-header-grid">
        {DIAS_SEMANA.map(dia => <div key={dia} className="calendar-header-cell">{dia}</div>)}
      </div>

      <div className="calendar-body-grid fade-in-grid" key={`${ano}-${mes}`}>
        {calendarGrid.map((dia, index) => {
          const diaStr = `${dia.ano}-${dia.mes}-${dia.dia}`;
          const mesFmt = String(dia.mes + 1).padStart(2, '0');
          const diaFmt = String(dia.dia).padStart(2, '0');
          const feriadoKey = `${dia.ano}-${mesFmt}-${diaFmt}`;
          const nomeFeriado = feriados[feriadoKey];
          const isHoje = diaStr === hojeStr && dia.tipo === 'current';
          
          let cellClass = 'calendar-day-cell';
          if (dia.tipo !== 'current') cellClass += ' other-month';
          if (isHoje) cellClass += ' today';
          
          return (
            <div key={index} className={cellClass}>
              <div className="day-header">
                <span className="day-number">{dia.dia}</span>
                {nomeFeriado && (
                  <div className="holiday-indicator" onMouseEnter={(e) => handleHolidayHover(e, nomeFeriado)} onMouseLeave={handleHolidayLeave}></div>
                )}
              </div>
            </div>
          );
        })}

        {isLoading && <div className="calendar-loading">Carregando agenda...</div>}
        {error && <div className="calendar-error">Não foi possível carregar os dados.</div>}
        
        {eventosDoCalendario.map(evento => {
          // Define cursor baseado no status (Pendente = pointer, Aprovado = not-allowed/default)
          const isEditable = evento.status === 'Pendente';
          
          return (
            <div 
              key={evento.id} 
              className="vacation-card-wrapper"
              style={{ 
                top: evento.top, 
                left: evento.left, 
                width: evento.width,
                cursor: isEditable ? 'pointer' : 'default',
                zIndex: isEditable ? 10 : 5 // Pendentes ficam levemente acima
              }}
              onClick={(e) => handleCardClick(e, evento)}
              title={isEditable ? "Clique para editar" : "Registro Consolidado (Somente Leitura)"}
            >
              <div 
                className="vacation-card-inner"
                style={{
                  backgroundColor: evento.colors.bg,
                  borderColor: evento.colors.border,
                  color: evento.colors.text,
                  borderStyle: evento.tipo === 'Folga Pessoal' ? 'dashed' : 'solid',
                  // Opacidade reduzida para Pendentes para indicar "Rascunho"
                  opacity: isEditable ? 0.85 : 1, 
                  boxShadow: isEditable ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
                }}
              >
                {/* Indicador visual de Status */}
                {isEditable && <span style={{marginRight:'4px', fontSize:'0.8em'}}>✏️</span>}
                {!isEditable && <span style={{marginRight:'4px', fontSize:'0.7em', opacity:0.6}}>🔒</span>}
                
                {evento.nome}
              </div>
            </div>
          );
        })}
      </div>

      {tooltip.visible && (
        <div className="holiday-tooltip" style={{ left: tooltip.x, top: tooltip.y, position: 'fixed' }}>
          {tooltip.text}
        </div>
      )}
    </div>
  );
}

export default CalendarioFerias;