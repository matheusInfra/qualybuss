// src/components/Chat/ChatFlutuante.jsx
import React, { useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import './ChatFlutuante.css'; // Criaremos este CSS

function ChatFlutuante() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
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
    if (!userInput) return;

    // Adiciona a mensagem do usuário à UI
    setMessages(prev => [...prev, { sender: 'user', text: userInput }]);
    setIsLoading(true);
    e.target.reset();

    try {
      // --- CHAMADA PARA O BACKEND ---
      // Esta é a chamada segura para nossa Edge Function
      const { data, error } = await supabase.functions.invoke('chat-assistente', {
        // O 'body' é o que enviamos para a função
        body: { prompt: userInput } 
      });

      if (error) throw error;
      
      // Adiciona a resposta da IA à UI
      setMessages(prev => [...prev, { sender: 'ai', text: data.reply }]);

    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { 
        sender: 'ai', 
        text: `Desculpe, ocorreu um erro: ${err.message}` 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="chat-flutuante-wrapper">
      {/* O Chat (Janela) */}
      <div className={`chat-janela ${isOpen ? 'open' : ''}`}>
        {/* Cabeçalho */}
        <div className="chat-header">
          <h3>QualyBot</h3>
          <button onClick={toggleChat} className="chat-close-btn">&times;</button>
        </div>
        
        {/* Mensagens */}
        <div className="chat-messages">
          {messages.map((msg, index) => (
            <div key={index} className={`message ${msg.sender}`}>
              {msg.text}
            </div>
          ))}
          {isLoading && <div className="message ai typing">Digitando...</div>}
        </div>
        
        {/* Input */}
        <form className="chat-input-form" onSubmit={handleSubmit}>
          <input
            type="text"
            name="prompt"
            placeholder="Digite sua pergunta..."
            autoComplete="off"
            disabled={isLoading}
          />
          <button type="submit" disabled={isLoading}>
            <span className="material-symbols-outlined">send</span>
          </button>
        </form>
      </div>

      {/* O Botão Flutuante */}
      <button onClick={toggleChat} className="chat-fab">
        <span className="material-symbols-outlined">chat</span>
      </button>
    </div>
  );
}

export default ChatFlutuante;