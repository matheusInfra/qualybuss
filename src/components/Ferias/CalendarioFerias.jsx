// src/components/Ferias/CalendarioFerias.jsx
import React, { useMemo, useState, useEffect } from 'react';
import useSWR from 'swr';
import { useNavigate } from 'react-router-dom';
import { generateCalendarGrid } from '../../utils/dateUtils';
import { getFeriasAprovadasParaCalendario } from '../../services/ausenciaService';
import { getFeriadosAno } from '../../services/feriadoService';
import { getColorForString } from '../../utils/colorUtils';
import './CalendarioFerias.css'; // Mantenha este CSS

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const dateToLocalISO = (dateStr) => {
  if (!dateStr) return null;
  const datePart = dateStr.split('T')[0];
  const parts = datePart.split('-');
  return new Date(parts[0], parts[1] - 1, parts[2]);
};

// Lógica de Posicionamento (Refinada - NÃO MUDOU)
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
    
    const colors = getColorForString(item.funcionario_id);

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
        nome: item.funcionarios.nome_completo,
        top: `calc(${semanaIndex} * (100% / 6) + ${TOP_OFFSET + (trilho * CARD_HEIGHT)}px)`,
        left: `calc(${diaDaSemana} * (100% / 7))`,
        width: `calc(${diasNestaLinha} * (100% / 7))`,
        colors: colors
      });
      
      indexAtual += diasNestaLinha;
    }
  });

  return eventos;
};


function CalendarioFerias({ data, searchTerm, departamentoFiltro }) {
  const ano = data.getFullYear();
  const mes = data.getMonth() + 1;
  const navigate = useNavigate();
  const [feriados, setFeriados] = useState({});
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, text: '' });

  // Busca Feriados
  useEffect(() => {
    getFeriadosAno(ano).then(setFeriados);
  }, [ano]);

  const calendarGrid = generateCalendarGrid(data);

  const { data: ferias, error, isLoading } = useSWR(
    ['ferias', ano, mes, searchTerm, departamentoFiltro], 
    () => getFeriasAprovadasParaCalendario(ano, mes, searchTerm, departamentoFiltro)
  );

  const eventosDoCalendario = useMemo(() => {
    return calcularPosicaoEventos(ferias, calendarGrid);
  }, [ferias, calendarGrid]);

  const handleCardClick = (evento) => {
    navigate('/ausencias', { state: { openModalForId: evento.realId, tipo: 'debito' } });
  };

  const handleHolidayHover = (e, name) => {
    setTooltip({ 
      visible: true, 
      x: e.clientX + 10, // Posição ao lado do mouse
      y: e.clientY + 10,
      text: name 
    });
  };

  const handleHolidayLeave = () => {
    setTooltip({ visible: false, x: 0, y: 0, text: '' });
  };


  const hoje = new Date();
  // Formato interno do diaStr: AAAA-MM-DD com mês 0-11
  const hojeStr = `${hoje.getFullYear()}-${hoje.getMonth()}-${hoje.getDate()}`;

  return (
    <div className="calendar-container">
      <div className="calendar-header-grid">
        {DIAS_SEMANA.map(dia => <div key={dia} className="calendar-header-cell">{dia}</div>)}
      </div>

      <div className="calendar-body-grid fade-in-grid" key={`${ano}-${mes}`}>
        {calendarGrid.map((dia, index) => {
          const diaStr = `${dia.ano}-${dia.mes}-${dia.dia}`; // Formato interno (0-11)
          
          // Formato da API de Feriados (AAAA-MM-DD com mês 1-12 e zero à esquerda)
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
                {/* INDICADOR DE FERIADO: BOLINHA COM TOOLTIP */}
                {nomeFeriado && (
                  <div 
                    className="holiday-indicator" 
                    onMouseEnter={(e) => handleHolidayHover(e, nomeFeriado)}
                    onMouseLeave={handleHolidayLeave}
                    onClick={(e) => handleHolidayHover(e, nomeFeriado)} // Para mobile
                  ></div>
                )}
              </div>
            </div>
          );
        })}

        {isLoading && <div className="calendar-loading">Carregando...</div>}
        {error && <div className="calendar-error">Erro ao buscar dados.</div>}
        
        {eventosDoCalendario.map(evento => (
          <div 
            key={evento.id} 
            className="vacation-card-wrapper"
            style={{
              top: evento.top,
              left: evento.left,
              width: evento.width,
            }}
            onClick={() => handleCardClick(evento)}
          >
            <div 
              className="vacation-card-inner"
              style={{
                backgroundColor: evento.colors.bg,
                borderColor: evento.colors.border,
                color: evento.colors.text
              }}
            >
              {evento.nome}
            </div>
          </div>
        ))}
      </div>

      {/* TOOLTIP FLUTUANTE */}
      {tooltip.visible && (
        <div 
          className="holiday-tooltip" 
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
}

export default CalendarioFerias;