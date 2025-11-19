// src/utils/colorUtils.js

// Paleta de cores suaves (Pastel) para boa leitura
const COLORS = [
  { bg: '#e3f2fd', border: '#2196f3', text: '#0d47a1' }, // Azul
  { bg: '#e8f5e9', border: '#4caf50', text: '#1b5e20' }, // Verde
  { bg: '#fff3e0', border: '#ff9800', text: '#e65100' }, // Laranja
  { bg: '#f3e5f5', border: '#9c27b0', text: '#4a148c' }, // Roxo
  { bg: '#ffebee', border: '#f44336', text: '#b71c1c' }, // Vermelho
  { bg: '#e0f7fa', border: '#00bcd4', text: '#006064' }, // Ciano
  { bg: '#fffde7', border: '#ffeb3b', text: '#f57f17' }, // Amarelo
  { bg: '#fce4ec', border: '#e91e63', text: '#880e4f' }, // Rosa
];

/**
 * Gera uma cor consistente baseada em uma string (ID ou Nome).
 */
export const getColorForString = (str) => {
  if (!str) return COLORS[0];
  
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const index = Math.abs(hash % COLORS.length);
  return COLORS[index];
};