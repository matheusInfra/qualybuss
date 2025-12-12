// src/components/Chat/ChatFlutuante.jsx
import React, { useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import './ChatFlutuante.css';

function ChatFlutuante() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  // Mensagem inicial de boas-vindas
  const [messages, setMessages] = useState([
    {
      sender: 'ai',
      text: 'Olá! Eu sou o QualyBot, seu assistente de RH. Como posso ajudar?'
    }
  ]);

  const toggleChat = () => setIsOpen(!isOpen);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const userInput = e.target.elements.prompt.value;
    
    // Evita envio vazio
    if (!userInput.trim()) return;

    // 1. Adiciona a mensagem do usuário à interface imediatamente (UX)
    setMessages(prev => [...prev, { sender: 'user', text: userInput }]);
    setIsLoading(true);
    e.target.reset(); // Limpa o input

    try {
      // 2. Chama a Edge Function 'chat-assistente' (Conectada ao Google Gemini)
      const { data, error } = await supabase.functions.invoke('chat-assistente', {
        body: { prompt: userInput } 
      });

      if (error) throw error;
      
      // 3. Adiciona a resposta da IA à interface
      // O Gemini pode retornar Markdown, mas por enquanto exibimos como texto puro
      setMessages(prev => [...prev, { sender: 'ai', text: data.reply }]);

    } catch (err) {
      console.error('Erro no chat:', err);
      setMessages(prev => [...prev, { 
        sender: 'ai', 
        text: `Desculpe, não consegui me conectar ao servidor. Tente novamente.` 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="chat-flutuante-wrapper">
      {/* A Janela do Chat (renderizada condicionalmente via CSS) */}
      <div className={`chat-janela ${isOpen ? 'open' : ''}`}>
        
        {/* Cabeçalho */}
        <div className="chat-header">
          <h3>QualyBot</h3>
          <button onClick={toggleChat} className="chat-close-btn" aria-label="Fechar chat">
            &times;
          </button>
        </div>
        
        {/* Área de Mensagens */}
        <div className="chat-messages">
          {messages.map((msg, index) => (
            <div key={index} className={`message ${msg.sender}`}>
              {msg.text}
            </div>
          ))}
          {/* Indicador de Digitação */}
          {isLoading && <div className="message ai typing">Digitando...</div>}
        </div>
        
        {/* Formulário de Envio */}
        <form className="chat-input-form" onSubmit={handleSubmit}>
          <input
            type="text"
            name="prompt"
            placeholder="Digite sua pergunta..."
            autoComplete="off"
            disabled={isLoading}
          />
          <button type="submit" disabled={isLoading} title="Enviar">
            <span className="material-symbols-outlined">send</span>
          </button>
        </form>
      </div>

      {/* O Botão Flutuante (FAB) para abrir/fechar */}
      <button onClick={toggleChat} className="chat-fab" aria-label="Abrir chat">
        <span className="material-symbols-outlined">chat</span>
      </button>
    </div>
  );
}

export default ChatFlutuante;