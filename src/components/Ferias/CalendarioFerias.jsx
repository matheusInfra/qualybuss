// src/components/Ferias/CalendarioFerias.jsx
import React, { useMemo, useState, useEffect } from 'react';
import useSWR from 'swr';
import { useNavigate } from 'react-router-dom';
import { generateCalendarGrid } from '../../utils/dateUtils';
import { getFeriasAprovadasParaCalendario } from '../../services/ausenciaService';
import { getFeriadosAno } from '../../services/feriadoService';
import { getColorForString } from '../../utils/colorUtils';
import './CalendarioFerias.css';

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

// Helper para converter string "YYYY-MM-DD" em Date local (evitando timezone)
const dateToLocalISO = (dateStr) => {
  if (!dateStr) return null;
  const datePart = dateStr.split('T')[0];
  const parts = datePart.split('-');
  return new Date(parts[0], parts[1] - 1, parts[2]);
};

// Lógica de Posicionamento dos Cards no Grid
const calcularPosicaoEventos = (ferias, grid) => {
  const eventos = [];
  if (!ferias || ferias.length === 0) return eventos;

  // "Trilhos" virtuais para empilhar eventos na mesma semana sem sobrepor
  const weekTracks = Array(6).fill(null).map(() => []); 
  const CARD_HEIGHT = 24;
  const TOP_OFFSET = 32;
  
  // Limites da grade visual
  const inicioGrade = dateToLocalISO(`${grid[0].ano}-${grid[0].mes + 1}-${grid[0].dia}`);
  const fimGrade = dateToLocalISO(`${grid[41].ano}-${grid[41].mes + 1}-${grid[41].dia}`);

  // Ordena por duração (eventos longos primeiro evitam buracos)
  const feriasOrdenadas = [...ferias].sort((a, b) => {
    const duracaoA = new Date(a.data_fim) - new Date(a.data_inicio);
    const duracaoB = new Date(b.data_fim) - new Date(b.data_inicio);
    return duracaoB - duracaoA;
  });

  feriasOrdenadas.forEach(item => {
    const inicioFerias = dateToLocalISO(item.data_inicio);
    const fimFerias = dateToLocalISO(item.data_fim);

    // Se o evento está fora do mês exibido, ignora
    if (!inicioFerias || !fimFerias || fimFerias < inicioGrade || inicioFerias > fimGrade) return;

    // Ajusta o início/fim visuais para caber na grade
    const inicioReal = inicioFerias < inicioGrade ? inicioGrade : inicioFerias;
    const fimReal = fimFerias > fimGrade ? fimGrade : fimFerias;

    // Calcula índice inicial e final (0 a 41)
    const startIndex = Math.max(0, Math.ceil((inicioReal - inicioGrade) / (1000 * 60 * 60 * 24)));
    const endIndex = Math.min(41, Math.ceil((fimReal - inicioGrade) / (1000 * 60 * 60 * 24)));

    let indexAtual = startIndex;
    
    // --- CORREÇÃO DE COR (Status Pendente vs Aprovado) ---
    let colors;
    if (item.status === 'Pendente') {
      // Cor de Alerta para Pendente
      colors = { bg: '#fff7ed', border: '#f97316', text: '#c2410c' };
    } else {
      // Cor Padrão (Gerada pelo ID) para Aprovado
      colors = getColorForString(item.funcionario_id);
    }

    // Loop para "quebrar" o evento se ele mudar de semana (ex: Sábado -> Domingo)
    while (indexAtual <= endIndex) {
      const semanaIndex = Math.floor(indexAtual / 7);
      if (semanaIndex > 5) break; 

      const diaDaSemana = indexAtual % 7;
      const diasRestantesNaSemana = 7 - diaDaSemana;
      const diasRestantesNoEvento = (endIndex - indexAtual) + 1;
      const diasNestaLinha = Math.min(diasRestantesNaSemana, diasRestantesNoEvento);

      // Encontra um "trilho" livre verticalmente nesta semana
      let trilho = 0;
      while (true) {
        // Verifica se este trilho já está ocupado até um índice maior que o atual
        const isOcupado = weekTracks[semanaIndex][trilho] && weekTracks[semanaIndex][trilho] >= indexAtual;
        if (!isOcupado) break;
        trilho++;
      }

      // Marca o trilho como ocupado
      weekTracks[semanaIndex][trilho] = indexAtual + diasNestaLinha - 1;

      eventos.push({
        id: `${item.id}-${indexAtual}`,
        realId: item.id,
        nome: item.funcionarios?.nome_completo || 'Colaborador',
        // Cálculos CSS para posicionamento absoluto
        top: `calc(${semanaIndex} * (100% / 6) + ${TOP_OFFSET + (trilho * CARD_HEIGHT)}px)`,
        left: `calc(${diaDaSemana} * (100% / 7))`,
        width: `calc(${diasNestaLinha} * (100% / 7))`,
        colors: colors,
        status: item.status
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

  // Busca Feriados da API
  useEffect(() => {
    getFeriadosAno(ano).then(setFeriados);
  }, [ano]);

  // Gera a grade de dias
  const calendarGrid = generateCalendarGrid(data);

  // Busca dados do Supabase (com cache SWR)
  const { data: ferias, error, isLoading } = useSWR(
    ['ferias', ano, mes, searchTerm, departamentoFiltro], 
    () => getFeriasAprovadasParaCalendario(ano, mes, searchTerm, departamentoFiltro)
  );

  // Calcula posições apenas quando os dados mudam
  const eventosDoCalendario = useMemo(() => {
    return calcularPosicaoEventos(ferias, calendarGrid);
  }, [ferias, calendarGrid]);

  const handleCardClick = (evento) => {
    // Abre o modal de edição para aquele evento
    // Usamos o estado de navegação que é lido na AusenciasPage (ou aqui se tiver modal local)
    // Como a lógica de modal está na AusenciasPage, redirecionamos para lá
    // (Alternativa: abrir modal aqui mesmo se refatorar)
    navigate('/ausencias', { state: { openModalForId: evento.realId } });
  };

  const handleHolidayHover = (e, name) => {
    const rect = e.target.getBoundingClientRect();
    setTooltip({ 
      visible: true, 
      x: rect.left + window.scrollX + 10, 
      y: rect.top + window.scrollY - 30,
      text: name 
    });
  };

  const handleHolidayLeave = () => {
    setTooltip({ visible: false, x: 0, y: 0, text: '' });
  };

  const hoje = new Date();
  const hojeStr = `${hoje.getFullYear()}-${hoje.getMonth()}-${hoje.getDate()}`;

  return (
    <div className="calendar-container">
      {/* Cabeçalho Dias da Semana */}
      <div className="calendar-header-grid">
        {DIAS_SEMANA.map(dia => <div key={dia} className="calendar-header-cell">{dia}</div>)}
      </div>

      {/* Grid de Dias */}
      <div className="calendar-body-grid fade-in-grid" key={`${ano}-${mes}`}>
        {calendarGrid.map((dia, index) => {
          const diaStr = `${dia.ano}-${dia.mes}-${dia.dia}`;
          
          // Formato para verificar feriado (YYYY-MM-DD com zero à esquerda)
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
                {/* Indicador de Feriado */}
                {nomeFeriado && (
                  <div 
                    className="holiday-indicator" 
                    onMouseEnter={(e) => handleHolidayHover(e, nomeFeriado)}
                    onMouseLeave={handleHolidayLeave}
                  ></div>
                )}
              </div>
            </div>
          );
        })}

        {/* Estados de Loading/Erro */}
        {isLoading && <div className="calendar-loading">Carregando agenda...</div>}
        {error && <div className="calendar-error">Não foi possível carregar os dados.</div>}
        
        {/* Renderização dos Eventos (Barrinhas Coloridas) */}
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
            title={`${evento.nome} - ${evento.status}`}
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

      {/* Tooltip de Feriado */}
      {tooltip.visible && (
        <div 
          className="holiday-tooltip" 
          style={{ left: tooltip.x, top: tooltip.y, position: 'absolute' }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
}

export default CalendarioFerias;